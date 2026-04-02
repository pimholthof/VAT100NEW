import { createServiceClient } from "@/lib/supabase/service";
import { ProcessingResult } from "./types";
import { agents } from "./agents"; // We'll create this registry next

/**
 * The core engine of the VAT100 Automation Ecosystem.
 * This function is intended to be called by a cron job (API route).
 */
export async function processSystemEvents(batchSize = 25): Promise<ProcessingResult> {
  const supabase = createServiceClient();
  // 1. Fetch unprocessed events
  // We use processed_at IS NULL to find new events
  const { data: events, error } = await supabase
    .from("system_events")
    .select("*")
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (error) {
    console.error(`[EventProcessor] Error fetching events:`, error);
    return { batchesProcessed: 0, eventsProcessed: 0, successes: 0, failures: 0, errors: [error] };
  }

  const result: ProcessingResult = {
    batchesProcessed: 1,
    eventsProcessed: events?.length || 0,
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
    try {
      // Find agents interested in this event type
      const matchingAgents = agents.filter(
        (a) => a.targetEvents.includes(event.event_type) || a.targetEvents.includes("*")
      );

      if (matchingAgents.length === 0) {
        // No matching agents for this event type
      } else {
        
        // Execute all matching agents in parallel
        const agentResults = await Promise.allSettled(
          matchingAgents.map((agent) => agent.run(event))
        );

        // Check if all agents succeeded
        const anyFailure = agentResults.some((r) => r.status === "rejected" || r.value === false);
        if (anyFailure) {
          result.failures++;
        } else {
          result.successes++;
        }
      }

      // 3. Mark event as processed
      // We mark it even on failure to avoid infinite loops, 
      // specific error info should be logged by agents or in an activity table.
      await supabase
        .from("system_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", event.id);

    } catch (e) {
      console.error(`[EventProcessor] Unexpected error processing event ${event.id}:`, e);
      result.errors.push(e);
      result.failures++;
      
      // Still mark it as processed to keep moving
      await supabase
        .from("system_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", event.id);
    }
  }


  return result;
}
