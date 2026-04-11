/**
 * Dead Letter Queue (DLQ) voor gefaalde system_events.
 *
 * Events die definitief falen (MAX_EVENT_ATTEMPTS bereikt)
 * worden naar de DLQ verplaatst met failure context.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { alertCronFailure } from "@/lib/monitoring/cron-alerts";

interface FailedEvent {
  id: string;
  event_type: string;
  payload: unknown;
  user_id: string | null;
  attempts: number;
  last_error: string | null;
}

/**
 * Verplaats een definitief gefaald event naar de DLQ.
 */
export async function moveToDeadLetterQueue(event: FailedEvent): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase.from("system_events_dlq").insert({
    original_event_id: event.id,
    event_type: event.event_type,
    payload: event.payload,
    user_id: event.user_id,
    attempts: event.attempts,
    last_error: event.last_error,
    failed_at: new Date().toISOString(),
  });

  if (error) {
    console.error(`[DLQ] Failed to insert into DLQ:`, error);
    return;
  }

  // Alert admin bij DLQ accumulate
  const { count } = await supabase
    .from("system_events_dlq")
    .select("id", { count: "exact", head: true })
    .is("replayed_at", null);

  if (count && count >= 10) {
    await alertCronFailure("dlq-accumulation", new Error(`DLQ bevat ${count} onverwerkte events`), {
      latestEvent: event.event_type,
      totalDlqCount: count,
    });
  }
}

/**
 * Replay een DLQ event door het terug te plaatsen in system_events.
 */
export async function replayDlqEvent(dlqEventId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { data: dlqEvent, error: fetchError } = await supabase
    .from("system_events_dlq")
    .select("*")
    .eq("id", dlqEventId)
    .is("replayed_at", null)
    .single();

  if (fetchError || !dlqEvent) return false;

  // Maak een nieuw system_event aan
  const { error: insertError } = await supabase.from("system_events").insert({
    event_type: dlqEvent.event_type,
    payload: dlqEvent.payload,
    user_id: dlqEvent.user_id,
  });

  if (insertError) return false;

  // Markeer DLQ event als replayed
  await supabase
    .from("system_events_dlq")
    .update({ replayed_at: new Date().toISOString() })
    .eq("id", dlqEventId);

  return true;
}

/**
 * Haal DLQ statistieken op.
 */
export async function getDlqStats(): Promise<{ pending: number; replayed: number }> {
  const supabase = createServiceClient();

  const [{ count: pending }, { count: replayed }] = await Promise.all([
    supabase
      .from("system_events_dlq")
      .select("id", { count: "exact", head: true })
      .is("replayed_at", null),
    supabase
      .from("system_events_dlq")
      .select("id", { count: "exact", head: true })
      .not("replayed_at", "is", null),
  ]);

  return { pending: pending ?? 0, replayed: replayed ?? 0 };
}
