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
 * Cron: Run all AI agents for all active users (daily 03:00)
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Fetch all active user IDs
  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id");

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const results: Array<{ userId: string; reconciliation: number; payment: number; anticipation: number; investment: number; errors: string[] }> = [];

  for (const user of users ?? []) {
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

    results.push({ userId: user.id, reconciliation, payment, anticipation, investment, errors });
  }

  return NextResponse.json({
    usersProcessed: results.length,
    results,
  });
}
