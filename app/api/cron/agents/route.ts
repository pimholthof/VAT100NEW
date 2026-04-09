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

  for (const user of users ?? []) {
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

  await supabase.from("system_events").insert({
    event_type: "cron.agents",
    payload: {
      users_processed: results.length,
      reconciliation_created: results.reduce((sum, result) => sum + result.reconciliation, 0),
      payment_created: results.reduce((sum, result) => sum + result.payment, 0),
      anticipation_created: results.reduce((sum, result) => sum + result.anticipation, 0),
      investment_created: results.reduce((sum, result) => sum + result.investment, 0),
      missing_receipt_created: results.reduce((sum, result) => sum + result.missingReceipt, 0),
      btw_deadline_alerts_created: results.filter((result) => result.btwDeadlineAlert).length,
      users_with_errors: results.filter((result) => result.errors.length > 0).length,
    },
    processed_at: new Date().toISOString(),
  });

  return NextResponse.json({
    usersProcessed: results.length,
    results,
  });
}
