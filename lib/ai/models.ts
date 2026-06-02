/**
 * Centrale model-routing.
 *
 * Marge-hefboom: de juiste Claude-variant kiezen per taak i.p.v. overal
 * Sonnet gebruiken. Haiku is ~12x goedkoper dan Sonnet voor simpele
 * classificatie.
 */

export const AI_MODELS = {
  /** Snelle classificatie: VAT-rate, categorie, transactie-match. */
  CLASSIFIER: "claude-haiku-4-5-20251001",
  /** OCR + structured extractie van bonnen en facturen. */
  OCR: "claude-sonnet-4-6",
} as const;

export type AiTask = keyof typeof AI_MODELS;

/**
 * Kies het juiste model voor een taak en laat de standaard-config
 * elders (max_tokens, caching) op de call-site bepaald worden.
 */
export function modelFor(task: AiTask): string {
  return AI_MODELS[task];
}
