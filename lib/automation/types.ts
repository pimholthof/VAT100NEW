import { Database } from "@/lib/database.types";

export type SystemEventRow = Database['public']['Tables']['system_events']['Row'];

/**
 * The standard structure for any Agent in the VAT100 fleet.
 */
export interface Agent {
  name: string;
  description: string;
  /**
   * List of event types this agent listens to.
   * Use ['*'] to listen to all events.
   */
  targetEvents: string[];
  /**
   * The core logic for the agent.
   * Returns true if successful, false if it failed.
   */
  run: (event: SystemEventRow) => Promise<boolean>;
}

/**
 * Result of the event processing run.
 */
export interface ProcessingResult {
  batchesProcessed: number;
  eventsProcessed: number;
  successes: number;
  failures: number;
  errors: unknown[];
}
