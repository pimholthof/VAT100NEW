import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { runReconciliationAgent } from "@/lib/actions/action-feed";

/**
 * Agent 2: Reconciliation Engine (Cron Endpoint)
 * 
 * This endpoint is designed to be called by Vercel Cron Jobs.
 * It scans all active users' uncategorized transactions and
 * generates action items in the action_feed table.
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/agents/reconcile",
 *     "schedule": "0 6 * * *"
 *   }]
 * }
 */
export async function GET(request: Request) {
  // Verify cron secret (Vercel sends this automatically)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all users with active bank connections
    const supabase = createServiceClient();
    const { data: connections, error } = await supabase
      .from("bank_connections")
      .select("user_id")
      .eq("status", "active");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Deduplicate user IDs
    const userIds = [...new Set((connections ?? []).map((c) => c.user_id))];

    // Run reconciliation for each user
    const results = await Promise.allSettled(
      userIds.map((userId) => runReconciliationAgent(userId))
    );

    const summary = results.map((r, i) => ({
      userId: userIds[i],
      status: r.status,
      result: r.status === "fulfilled" ? r.value : null,
    }));

    return NextResponse.json({
      processed: userIds.length,
      summary,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
