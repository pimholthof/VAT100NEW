import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  runReconciliationAgent,
  runPaymentDetectionAgent,
  runAnticipationAgent,
  runInvestmentAgent,
} from "@/features/dashboard/action-feed";
import * as Sentry from "@sentry/nextjs";

/**
 * Unified Cron Endpoint for all AI Agents.
 *
 * Runs all four agents (reconciliation, payment detection, anticipation,
 * investment) for every user with an active bank connection.
 *
 * Called daily by Vercel Cron (see vercel.json).
 * Protected by CRON_SECRET bearer token.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    // Get all users with active bank connections
    const { data: connections, error } = await supabase
      .from("bank_connections")
      .select("user_id")
      .eq("status", "active");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userIds = [...new Set((connections ?? []).map((c) => c.user_id))];

    const results = await Promise.allSettled(
      userIds.map(async (userId) => {
        const [reconciliation, payment, anticipation, investment] = await Promise.allSettled([
          runReconciliationAgent(userId, supabase),
          runPaymentDetectionAgent(userId, supabase),
          runAnticipationAgent(userId, supabase),
          runInvestmentAgent(userId, supabase),
        ]);

        return {
          userId,
          reconciliation: reconciliation.status === "fulfilled" ? reconciliation.value : { error: "failed" },
          payment: payment.status === "fulfilled" ? payment.value : { error: "failed" },
          anticipation: anticipation.status === "fulfilled" ? anticipation.value : { error: "failed" },
          investment: investment.status === "fulfilled" ? investment.value : { error: "failed" },
        };
      })
    );

    return NextResponse.json({
      processed: userIds.length,
      results: results.map((r) => r.status === "fulfilled" ? r.value : { error: "failed" }),
    });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
