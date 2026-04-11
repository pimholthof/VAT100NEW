/**
 * Automation Configuration — Single Source of Truth
 *
 * Alle confidence drempels, batch sizes, en timing constanten
 * voor het automatisering-ecosysteem.
 */

// ─── Confidence Drempels (Fiscale Claims) ───

export const CONFIDENCE_THRESHOLDS = {
  /** Onder deze grens → presenteer als vraag, nooit auto-uitvoeren */
  HUMAN_REVIEW: 0.95,
  /** Boven deze grens → automatische uitvoering toegestaan */
  AUTO_EXECUTE: 0.98,
  /** Deterministische berekeningen (datumlogica, pure functies) */
  DETERMINISTIC: 1.0,
  /** Trefwoord-classificatie basiswaarde */
  KEYWORD_MATCH: 0.85,
} as const;

// ─── Plan-tier Confidence Drempels ───

export const PLAN_CONFIDENCE_THRESHOLDS: Record<string, number> = {
  studio: 0.9,
  compleet: 0.7,
};
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.8;

// ─── Agent Auto-execution Drempels ───

export const AGENT_THRESHOLDS = {
  /** Minimale confidence voor automatische factuur-transactie koppeling */
  INVOICE_MATCH: 0.8,
  /** Minimale confidence voor automatische bon-transactie koppeling */
  RECEIPT_MATCH: 0.7,
  /** Minimale confidence voor automatisch ledger posting */
  AUTO_LEDGER: 0.9,
  /** Minimale confidence voor autonome (no-review) matching in action feed */
  AUTONOMOUS_MATCH: 0.95,
  /** Categorisatie suggestie basis-confidence */
  CATEGORY_SUGGESTION: 0.7,
} as const;

// ─── Batch Processing ───

export const BATCH_CONFIG = {
  /** Events per event processor run */
  EVENT_BATCH_SIZE: 25,
  /** Users per cron agents batch */
  USER_BATCH_SIZE: 10,
  /** Parallelle user processing in cron */
  USER_CONCURRENCY: 5,
  /** Max execution time voor Vercel cron (ms) */
  MAX_CRON_EXECUTION_MS: 55_000,
  /** Max retry pogingen voor system events */
  MAX_EVENT_ATTEMPTS: 3,
  /** Stale claim detectie timeout (minuten) */
  STALE_CLAIM_MINUTES: 15,
} as const;

// ─── Cron Lock TTLs (minuten) ───

export const CRON_LOCK_TTL = {
  DEFAULT: 10,
  AGENTS: 30,
  BANK_SYNC: 15,
} as const;
