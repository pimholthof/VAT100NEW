/**
 * Agent Audit Trail
 *
 * Logt elke beslissing van een agent naar de admin_audit_log,
 * zodat bij fouten precies herleidbaar is welke prompt of data
 * de fout veroorzaakte.
 *
 * Gebruikt logServiceOperation() (system admin UUID) onder de motorkap.
 * Non-blocking: fouten worden naar Sentry gestuurd maar breken niets.
 */

import { logServiceOperation } from "@/lib/supabase/service";

export type AgentActionType =
  | "classification"
  | "tax_alert"
  | "match_suggestion"
  | "autonomous_action"
  | "audit_completed";

export interface AgentDecisionLog {
  agentName: string;
  actionType: AgentActionType;
  userId: string;
  confidence: number;
  inputSummary: Record<string, unknown>;
  outputSummary: Record<string, unknown>;
  actionFeedItemId?: string;
  wasAutoExecuted: boolean;
}

/**
 * Log een agent-beslissing naar de audit trail.
 * Verpakt logServiceOperation() met agent-specifieke metadata.
 */
export async function logAgentDecision(
  decision: AgentDecisionLog,
): Promise<void> {
  await logServiceOperation(
    `agent.${decision.actionType}`,
    decision.actionFeedItemId ? "action_feed" : "agent_action",
    decision.actionFeedItemId ?? decision.userId,
    {
      agent_name: decision.agentName,
      confidence: decision.confidence,
      was_auto_executed: decision.wasAutoExecuted,
      input_summary: decision.inputSummary,
      output_summary: decision.outputSummary,
    },
  );
}
