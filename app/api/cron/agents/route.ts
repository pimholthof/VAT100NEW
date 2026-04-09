import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret } from "@/lib/auth/verify-cron-secret";
import {
  runReconciliationAgent,
  runAnticipationAgent,
  runInvestmentAgent,
  runPaymentDetectionAgent,
  runMissingReceiptDetection,
  runBtwDeadlineAlert,
} from "@/features/dashboard/action-feed";
import * as Sentry from "@sentry/nextjs";

const BATCH_SIZE = 10;
const MAX_EXECUTION_MS = 8000;

/**
 * Cron: Run all AI agents for all active users (daily 03:00)
 * Uses cursor-based batching to stay within Vercel execution limits.
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const startTime = Date.now();

  const results: Array<{
    userId: string;
    reconciliation: number;
    payment: number;
    anticipation: number;
    investment: number;
    missingReceipt: number;
    btwDeadlineAlert: boolean;
    errors: string[];
  }> = [];

  let cursor = "00000000-0000-0000-0000-000000000000";
  let batchesCompleted = 0;
  let partial = false;
  let totalUsers = 0;

  // Get total user count for reporting
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });
  totalUsers = count ?? 0;

  while (true) {
    // Safety timeout: stop before Vercel kills us
    if (Date.now() - startTime > MAX_EXECUTION_MS) {
      partial = true;
      break;
    }

    const { data: batch, error: batchError } = await supabase
      .from("profiles")
      .select("id")
      .order("id")
      .gt("id", cursor)
      .limit(BATCH_SIZE);

    if (batchError) {
      return NextResponse.json({ error: batchError.message }, { status: 500 });
    }

    if (!batch || batch.length === 0) break;

    for (const user of batch) {
      // Check timeout before each user
      if (Date.now() - startTime > MAX_EXECUTION_MS) {
        partial = true;
        break;
      }

      const errors: string[] = [];
      let reconciliation = 0;
      let payment = 0;
      let anticipation = 0;
      let investment = 0;
      let missingReceipt = 0;
      let btwDeadlineAlert = false;

      const [recRes, payRes, antRes, invRes, missingReceiptRes, btwDeadlineRes] = await Promise.all([
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
        runMissingReceiptDetection(user.id, supabase).catch((e) => {
          Sentry.captureException(e, { tags: { agent: "missing-receipt", userId: user.id } });
          errors.push(`missing_receipt: ${e instanceof Error ? e.message : String(e)}`);
          return { error: "failed", data: { created: 0 } };
        }),
        runBtwDeadlineAlert(user.id, supabase).catch((e) => {
          Sentry.captureException(e, { tags: { agent: "btw-deadline", userId: user.id } });
          errors.push(`btw_deadline: ${e instanceof Error ? e.message : String(e)}`);
          return { error: "failed", data: { created: false } };
        }),
      ]);

      reconciliation = recRes.data?.created ?? 0;
      payment = payRes.data?.created ?? 0;
      anticipation = antRes.data?.created ?? 0;
      investment = invRes.data?.created ?? 0;
      missingReceipt = missingReceiptRes.data?.created ?? 0;
      btwDeadlineAlert = btwDeadlineRes.data?.created ?? false;

      results.push({
        userId: user.id,
        reconciliation,
        payment,
        anticipation,
        investment,
        missingReceipt,
        btwDeadlineAlert,
        errors,
      });
    }

    if (partial) break;

    cursor = batch[batch.length - 1].id;
    batchesCompleted++;
  }

  await supabase.from("system_events").insert({
    event_type: "cron.agents",
    payload: {
      users_processed: results.length,
      total_users: totalUsers,
      batches_completed: batchesCompleted,
      partial,
      execution_ms: Date.now() - startTime,
      reconciliation_created: results.reduce((sum, r) => sum + r.reconciliation, 0),
      payment_created: results.reduce((sum, r) => sum + r.payment, 0),
      anticipation_created: results.reduce((sum, r) => sum + r.anticipation, 0),
      investment_created: results.reduce((sum, r) => sum + r.investment, 0),
      missing_receipt_created: results.reduce((sum, r) => sum + r.missingReceipt, 0),
      btw_deadline_alerts_created: results.filter((r) => r.btwDeadlineAlert).length,
      users_with_errors: results.filter((r) => r.errors.length > 0).length,
    },
    processed_at: new Date().toISOString(),
  });

  return NextResponse.json({
    usersProcessed: results.length,
    totalUsers,
    partial,
    results,
  });
}
