import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret } from "@/lib/auth/verify-cron-secret";
import {
  runReconciliationAgent,
  runAnticipationAgent,
  runInvestmentAgent,
  runPaymentDetectionAgent,
} from "@/features/dashboard/action-feed";
import * as Sentry from "@sentry/nextjs";

/**
 * Check if a user had financial activity since the last agent run.
 * Activity = new invoices, receipts, bank transactions, or quotes.
 * If no activity, we skip the expensive AI agents (€0 cost).
 */
async function hasRecentActivity(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  since: string
): Promise<boolean> {
  // Run all activity checks in parallel — stop as soon as one returns true
  const checks = await Promise.all([
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since),
    supabase
      .from("receipts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since),
    supabase
      .from("bank_transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since),
    supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since),
  ]);

  return checks.some((result) => (result.count ?? 0) > 0);
}

/**
 * Cron: Run AI agents for financially active users (daily 06:00).
 *
 * Activity gate: only users with new invoices, receipts, transactions,
 * or quotes since yesterday are processed. Inactive users cost €0.
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Fetch all user IDs
  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id");

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  // Activity window: last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const results: Array<{
    userId: string;
    skipped: boolean;
    reconciliation: number;
    payment: number;
    anticipation: number;
    investment: number;
    errors: string[];
  }> = [];

  let skippedCount = 0;

  for (const user of users ?? []) {
    // Activity gate: skip users with no recent financial activity
    const active = await hasRecentActivity(supabase, user.id, since);
    if (!active) {
      skippedCount++;
      results.push({
        userId: user.id,
        skipped: true,
        reconciliation: 0,
        payment: 0,
        anticipation: 0,
        investment: 0,
        errors: [],
      });
      continue;
    }

    const errors: string[] = [];
    let reconciliation = 0;
    let payment = 0;
    let anticipation = 0;
    let investment = 0;

    const [recRes, payRes, antRes, invRes] = await Promise.all([
      runReconciliationAgent(user.id, supabase).catch((e) => {
        Sentry.captureException(e, { tags: { agent: "reconciliation", userId: user.id } });
        errors.push(`reconciliation: ${e instanceof Error ? e.message : String(e)}`);
        return { error: "failed", data: { created: 0 } };
      }),
      runPaymentDetectionAgent(user.id, supabase).catch((e) => {
        Sentry.captureException(e, { tags: { agent: "payment-detection", userId: user.id } });
        errors.push(`payment: ${e instanceof Error ? e.message : String(e)}`);
        return { error: "failed", data: { created: 0 } };
      }),
      runAnticipationAgent(user.id, supabase).catch((e) => {
        Sentry.captureException(e, { tags: { agent: "anticipation", userId: user.id } });
        errors.push(`anticipation: ${e instanceof Error ? e.message : String(e)}`);
        return { error: "failed", data: { created: 0 } };
      }),
      runInvestmentAgent(user.id, supabase).catch((e) => {
        Sentry.captureException(e, { tags: { agent: "investment", userId: user.id } });
        errors.push(`investment: ${e instanceof Error ? e.message : String(e)}`);
        return { error: "failed", data: { created: 0 } };
      }),
    ]);

    reconciliation = recRes.data?.created ?? 0;
    payment = payRes.data?.created ?? 0;
    anticipation = antRes.data?.created ?? 0;
    investment = invRes.data?.created ?? 0;

    results.push({
      userId: user.id,
      skipped: false,
      reconciliation,
      payment,
      anticipation,
      investment,
      errors,
    });
  }

  const processed = results.filter((r) => !r.skipped);

  return NextResponse.json({
    totalUsers: results.length,
    activeUsers: processed.length,
    skippedUsers: skippedCount,
    results: processed,
  });
}
