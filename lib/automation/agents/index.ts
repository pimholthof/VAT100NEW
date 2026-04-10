import { Agent } from "../types";
import { qualificationAgent } from "./qualification-agent";
import { navigatorAgent } from "./navigator-agent";
import { retentionAgent } from "./retention-agent";
import { strategicAgent } from "./strategic-agent";
import { taxAuditorAgent } from "./tax-auditor-agent";
import { vatRateDetectorAgent } from "./vat-rate-detector-agent";
import { bookkeepingAgent } from "./bookkeeping-agent";
import { deadlineMonitorAgent } from "./deadline-monitor-agent";

/**
 * The Agent Registry: Add all new agents to this array.
 * Agents are executed by the EventProcessor.
 */
export const agents: Agent[] = [
  qualificationAgent,
  navigatorAgent,
  retentionAgent,
  strategicAgent,
  taxAuditorAgent,
  vatRateDetectorAgent,
  bookkeepingAgent,
  deadlineMonitorAgent,
];
