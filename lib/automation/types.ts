import { Database } from "@/lib/database.types";

export type SystemEventRow = Database['public']['Tables']['system_events']['Row'];

/**
 * The standard structure for any Agent in the VAT100 fleet.
 *
 * Agents kunnen op twee manieren worden uitgevoerd:
 * 1. Event-driven: `run(event)` — getriggerd door system_events
 * 2. Per-user scan: `runPerUser(userId)` — getriggerd door daily cron
 *
 * Dit maakt het mogelijk om beide execution systemen via één
 * geünificeerd Agent Registry te laten werken.
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
   * The core logic for the agent (event-driven).
   * Returns true if successful, false if it failed.
   */
  run: (event: SystemEventRow) => Promise<boolean>;
  /**
   * Optional: per-user scanning logic for agents die
   * periodiek voor alle gebruikers moeten draaien.
   * Gebruikt door de daily cron job.
   */
  runPerUser?: (userId: string) => Promise<boolean>;
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
