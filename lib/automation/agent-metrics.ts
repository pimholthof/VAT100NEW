/**
 * Agent Performance Metrics
 *
 * Track per-agent execution time en success rate.
 * Wordt aangeroepen door de event processor rond elke agent.run() call.
 */

import { createServiceClient } from "@/lib/supabase/service";

interface MetricEntry {
  agentName: string;
  eventId?: string;
  eventType?: string;
  userId?: string | null;
  executionMs: number;
  success: boolean;
  errorMessage?: string;
}

/**
 * Sla een agent metric op (fire-and-forget).
 */
export async function recordAgentMetric(entry: MetricEntry): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("agent_metrics").insert({
      agent_name: entry.agentName,
      event_id: entry.eventId,
      event_type: entry.eventType,
      user_id: entry.userId,
      execution_ms: entry.executionMs,
      success: entry.success,
      error_message: entry.errorMessage,
    });
  } catch {
    // Metrics mogen nooit de verwerking breken
  }
}

/**
 * Wrapper die een agent-run uitvoert en automatisch metrics vastlegt.
 */
export async function withMetrics<T>(
  agentName: string,
  eventId: string | undefined,
  eventType: string | undefined,
  userId: string | null | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const executionMs = Math.round(performance.now() - start);
    recordAgentMetric({
      agentName,
      eventId,
      eventType,
      userId,
      executionMs,
      success: true,
    }).catch(() => {});
    return result;
  } catch (err) {
    const executionMs = Math.round(performance.now() - start);
    recordAgentMetric({
      agentName,
      eventId,
      eventType,
      userId,
      executionMs,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    }).catch(() => {});
    throw err;
  }
}
