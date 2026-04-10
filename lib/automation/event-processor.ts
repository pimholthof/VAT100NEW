import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { getErrorMessage } from "@/lib/utils/errors";
import { ProcessingResult } from "./types";
import { agents } from "./agents";

/**
 * The core engine of the VAT100 Automation Ecosystem.
 * This function is intended to be called by a cron job (API route).
 */
const MAX_EVENT_ATTEMPTS = 3;
const STALE_CLAIM_MINUTES = 15;

export async function processSystemEvents(batchSize = 25): Promise<ProcessingResult> {
  const supabase = createServiceClient();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_CLAIM_MINUTES * 60 * 1000).toISOString();

  await supabase
    .from("system_events")
    .update({
      processing_started_at: null,
      processing_token: null,
    })
    .is("processed_at", null)
    .is("failed_at", null)
    .lt("processing_started_at", staleBefore);

  // 1. Fetch claimable events
  const { data: events, error } = await supabase
    .from("system_events")
    .select("*")
    .is("processed_at", null)
    .is("failed_at", null)
    .or(`processing_started_at.is.null,processing_started_at.lt.${staleBefore}`)
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (error) {
    console.error(`[EventProcessor] Error fetching events:`, error);
    return { batchesProcessed: 0, eventsProcessed: 0, successes: 0, failures: 0, errors: [error] };
  }

  const result: ProcessingResult = {
    batchesProcessed: 1,
    eventsProcessed: 0,
    successes: 0,
    failures: 0,
    errors: [],
  };

  if (!events || events.length === 0) {
    return result;
  }

  // Processing events silently — errors logged via console.error

  // 2. Process each event through matching agents
  for (const event of events) {
    const token = randomUUID();
    const claimStartedAt = new Date().toISOString();
    const { data: claimedEvent, error: claimError } = await supabase
      .from("system_events")
      .update({
        processing_started_at: claimStartedAt,
        processing_token: token,
        attempts: (event.attempts ?? 0) + 1,
        failed_at: null,
      })
      .eq("id", event.id)
      .is("processed_at", null)
      .is("failed_at", null)
      .or(`processing_token.is.null,processing_started_at.lt.${staleBefore}`)
      .select("*")
      .maybeSingle();

    if (claimError) {
      console.error(`[EventProcessor] Error claiming event ${event.id}:`, claimError);
      result.errors.push(claimError);
      continue;
    }

    if (!claimedEvent) {
      continue;
    }

    result.eventsProcessed++;

    try {
      // Find agents interested in this event type
      const matchingAgents = agents.filter(
        (a) => a.targetEvents.includes(claimedEvent.event_type) || a.targetEvents.includes("*")
      );

      let anyFailure = false;
      let lastError: string | null = null;

      if (matchingAgents.length === 0) {
        // No matching agents for this event type
      } else {
        // Execute all matching agents in parallel
        const agentResults = await Promise.allSettled(
          matchingAgents.map((agent) => agent.run(claimedEvent))
        );

        const agentErrors = agentResults.flatMap((agentResult) => {
          if (agentResult.status === "rejected") return [getErrorMessage(agentResult.reason)];
          if (agentResult.value === false) return ["Agent returned false"];
          return [];
        });

        anyFailure = agentErrors.length > 0;
        lastError = agentErrors.length > 0 ? agentErrors.join(" | ") : null;
      }

      if (anyFailure) {
        const exhausted = claimedEvent.attempts >= MAX_EVENT_ATTEMPTS;
        await supabase
          .from("system_events")
          .update({
            processing_started_at: null,
            processing_token: null,
            last_error: lastError,
            failed_at: exhausted ? new Date().toISOString() : null,
          })
          .eq("id", claimedEvent.id)
          .eq("processing_token", token);

        result.failures++;
        if (lastError) {
          result.errors.push(lastError);
        }
      } else {
        await supabase
          .from("system_events")
          .update({
            processed_at: new Date().toISOString(),
            processing_started_at: null,
            processing_token: null,
            last_error: null,
            failed_at: null,
          })
          .eq("id", claimedEvent.id)
          .eq("processing_token", token);

        result.successes++;
      }

    } catch (e) {
      console.error(`[EventProcessor] Unexpected error processing event ${claimedEvent.id}:`, e);
      result.errors.push(e);
      result.failures++;

      const exhausted = claimedEvent.attempts >= MAX_EVENT_ATTEMPTS;
      await supabase
        .from("system_events")
        .update({
          processing_started_at: null,
          processing_token: null,
          last_error: getErrorMessage(e),
          failed_at: exhausted ? new Date().toISOString() : null,
        })
        .eq("id", claimedEvent.id)
        .eq("processing_token", token);
    }
  }


  return result;
}
