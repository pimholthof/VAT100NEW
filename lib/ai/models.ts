/**
 * Centrale model-routing.
 *
 * Marge-hefboom: de juiste Claude-variant kiezen per taak i.p.v. overal
 * Sonnet gebruiken. Haiku is ~12x goedkoper dan Sonnet voor simpele
 * classificatie, Opus alleen inzetten waar redeneerkracht ertoe doet.
 */

export const AI_MODELS = {
  /** Snelle classificatie: VAT-rate, categorie, transactie-match. */
  CLASSIFIER: "claude-haiku-4-5-20251001",
  /** OCR + structured extractie van bonnen en facturen. */
  OCR: "claude-sonnet-4-6",
  /** Boekhouder-chat + strategische agents. */
  CHAT: "claude-opus-4-7",
  /** Agents (bookkeeping, deadline, retention) — batchbaar. */
  AGENT: "claude-sonnet-4-6",
} as const;

export type AiTask = keyof typeof AI_MODELS;

/**
 * Geschatte prijs (USD per 1M tokens) — alleen voor budget-monitoring,
 * niet voor billing. Bron: Anthropic pricing tabel.
 */
export const AI_COST_PER_MTOK = {
  CLASSIFIER: { input: 1, output: 5 },
  OCR: { input: 3, output: 15 },
  CHAT: { input: 15, output: 75 },
  AGENT: { input: 3, output: 15 },
} as const;

/**
 * Kies het juiste model voor een taak en laat de standaard-config
 * elders (max_tokens, caching) op de call-site bepaald worden.
 */
export function modelFor(task: AiTask): string {
  return AI_MODELS[task];
}

/**
 * Schatting in USD-cent voor een call met gegeven input/output tokens.
 * Gebruik voor audit-logging en alerting op onverwachte cost spikes.
 */
export function estimateCostCents(
  task: AiTask,
  inputTokens: number,
  outputTokens: number,
): number {
  const rate = AI_COST_PER_MTOK[task];
  const inputCost = (inputTokens / 1_000_000) * rate.input;
  const outputCost = (outputTokens / 1_000_000) * rate.output;
  return Math.ceil((inputCost + outputCost) * 100);
}
