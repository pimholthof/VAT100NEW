/**
 * Leer-kern — "verbetert zichzelf", domein-onafhankelijk en door de poort.
 *
 * Het systeem onthoudt bevestigde correcties als regels (tegenpartij → categorie,
 * leverancier → kostsoort, …) en past ze de volgende keer zelf toe. Deze module
 * is de pure, herbruikbare kern daarvan:
 *  - patronen normaliseren en matchen (exact, optioneel "bevat"), mét confidence;
 *  - die confidence door de veiligheidspoort halen (Tier 1 = omkeerbaar);
 *  - correcties consolideren tot het signaal "dit patroon is herhaald bevestigd"
 *    (zelf-verbetering op systeemniveau).
 *
 * Bewust regelgeheugen i.p.v. een getraind model: uitlegbaar, auditeerbaar en
 * deterministisch — wat een fiscale tool nodig heeft. Geen DB/AI/IO hierin.
 */

import {
  defineAction,
  decideAction,
  type AgentAction,
  type DispatchContext,
  type DispatchResult,
} from "./dispatcher";

export const EXACT_MATCH_CONFIDENCE = 0.98;
export const CONTAINS_MATCH_CONFIDENCE = 0.8;

export function normalizePattern(raw: string): string {
  return raw.toLowerCase().trim();
}

export interface MatchResult<R> {
  rule: R;
  matchType: "exact" | "contains";
  confidence: number;
}

/**
 * Matcht een ruwe sleutel tegen geleerde regels. Exacte match wint altijd; met
 * `allowContains` mag ook een patroon dat in de sleutel voorkomt matchen
 * (meest specifiek = langste patroon wint).
 */
export function matchLearnedRule<R extends { pattern: string }>(
  rules: R[],
  rawKey: string,
  opts: { allowContains?: boolean } = {},
): MatchResult<R> | null {
  const key = normalizePattern(rawKey);
  if (!key) return null;

  for (const rule of rules) {
    if (normalizePattern(rule.pattern) === key) {
      return { rule, matchType: "exact", confidence: EXACT_MATCH_CONFIDENCE };
    }
  }

  if (opts.allowContains) {
    let best: R | null = null;
    let bestLen = 0;
    for (const rule of rules) {
      const p = normalizePattern(rule.pattern);
      if (p && key.includes(p) && p.length > bestLen) {
        best = rule;
        bestLen = p.length;
      }
    }
    if (best) {
      return { rule: best, matchType: "contains", confidence: CONTAINS_MATCH_CONFIDENCE };
    }
  }

  return null;
}

export interface LearnedRuleDecision<R> {
  match: MatchResult<R>;
  action: AgentAction;
  decision: DispatchResult;
}

/**
 * Matcht én velt het besluit via de veiligheidspoort: het toepassen van een
 * geleerde regel is `apply_learned_rule` (Tier 1, omkeerbaar). Geen match → null.
 * Bij voldoende zekerheid → `execute`; anders/uit/onveilig → `propose`/`block`.
 */
export function decideLearnedRuleApplication<R extends { pattern: string; value: string }>(
  rules: R[],
  rawKey: string,
  ctx: DispatchContext,
  opts: { allowContains?: boolean } = {},
): LearnedRuleDecision<R> | null {
  const match = matchLearnedRule(rules, rawKey, opts);
  if (!match) return null;

  const action = defineAction("apply_learned_rule", {
    confidence: match.confidence,
    evidence: [
      `Geleerde regel (${match.matchType}): "${normalizePattern(rawKey)}" → ${match.rule.value}`,
    ],
    summary: `Pas geleerde uitkomst toe: ${match.rule.value}`,
  });

  return { match, action, decision: decideAction(action, ctx) };
}

// ─── Zelf-verbetering op systeemniveau ───

export interface Correction {
  pattern: string;
  value: string;
}

export interface ConsolidatedRule {
  /** Genormaliseerd patroon. */
  pattern: string;
  /** Dominante (meest bevestigde) waarde. */
  value: string;
  /** Aantal correcties dat de dominante waarde steunt. */
  strength: number;
  /** Totaal aantal correcties voor dit patroon. */
  total: number;
  /** Meerdere verschillende waarden gezien → handmatige aandacht. */
  conflicted: boolean;
}

/**
 * Groepeert correcties per patroon en kiest de dominante waarde. `strength`
 * (hoe vaak consistent bevestigd) is het signaal voor de controle-laag:
 * herhaalde, eensluidende correcties betekenen dat een (hardcoded) regel
 * bijgesteld mag worden; `conflicted` markeert tegenstrijdige correcties.
 */
export function consolidateCorrections(corrections: Correction[]): ConsolidatedRule[] {
  const byPattern = new Map<string, Map<string, number>>();
  for (const c of corrections) {
    const p = normalizePattern(c.pattern);
    if (!p) continue;
    const counts = byPattern.get(p) ?? new Map<string, number>();
    counts.set(c.value, (counts.get(c.value) ?? 0) + 1);
    byPattern.set(p, counts);
  }

  const result: ConsolidatedRule[] = [];
  for (const [pattern, counts] of byPattern) {
    let value = "";
    let strength = 0;
    let total = 0;
    for (const [v, n] of counts) {
      total += n;
      if (n > strength) {
        strength = n;
        value = v;
      }
    }
    result.push({ pattern, value, strength, total, conflicted: counts.size > 1 });
  }

  return result.sort((a, b) => b.strength - a.strength);
}
