import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { processSystemEvents } from "@/lib/automation/event-processor";
import { verifyCronSecret } from "@/lib/auth/verify-cron-secret";
import { createServiceClient } from "@/lib/supabase/service";
import { alertCronFailure } from "@/lib/monitoring/cron-alerts";
import { processWebhookRetries } from "@/lib/webhooks/retry-processor";

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
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Process system events
    const result = await processSystemEvents(50);

    // 2. Process webhook retries (gefaalde Mollie webhooks opnieuw proberen)
    let webhookRetries = null;
    try {
      webhookRetries = await processWebhookRetries();
    } catch (e) {
      Sentry.captureException(e, { tags: { area: "webhook-retries" } });
    }

    const supabase = createServiceClient();
    await supabase.from("system_events").insert({
      event_type: "cron.events",
      payload: {
        events_processed: result.eventsProcessed,
        successes: result.successes,
        failures: result.failures,
        errors: result.errors.length,
        webhook_retries: webhookRetries,
      },
      processed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      status: "success",
      ...result,
      webhookRetries,
    });
  } catch (err) {
    await alertCronFailure("agents-run-all", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
