import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { processSystemEvents } from "@/lib/automation/event-processor";

/**
 * Agent Fleet Orchestrator (Master Cron Endpoint)
 * 
 * This endpoint is designed to be called by Vercel Cron Jobs.
 * It processes all outstanding system events through the Agent registry.
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/agents/run-all",
 *     "schedule": "0 * / 4 * * *" // Every 4 hours (space added to prevent closing comment)
 *   }]
 * }
 */
export async function GET(request: Request) {
  // 1. Verify cron secret (Vercel sends this automatically)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. Run the processor
    // It will fetch 25 events per batch by default
    const result = await processSystemEvents(50);

    return NextResponse.json({
      status: "success",
      ...result,
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "agent-orchestrator" } });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
