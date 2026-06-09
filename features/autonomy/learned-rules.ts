/**
 * Generieke geleerde-regels-laag (server-side) — domein-onafhankelijk
 * "verbetert zichzelf". Legt bevestigde correcties vast en past ze de volgende
 * keer toe via de veiligheidspoort (`apply_learned_rule` = Tier 1).
 *
 * Leunt op de pure leer-kern (`lib/autonomy/learning.ts`) voor matching +
 * besluit; deze module doet alleen de opslag (tabel `learned_rules`). Bewust
 * géén "use server": het zijn interne helpers die vanuit andere server-actions
 * worden aangeroepen, met een meegegeven Supabase-client.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  decideLearnedRuleApplication,
  normalizePattern,
} from "@/lib/autonomy/learning";
import type { DispatchContext } from "@/lib/autonomy/dispatcher";

const DEFAULT_CTX: DispatchContext = { autonomyEnabled: true, invariantsOk: true };

export interface LearnedRuleRow {
  pattern: string;
  value: string;
  strength: number;
}

/**
 * Legt een bevestigde correctie vast, of versterkt een bestaande regel als de
 * uitkomst hetzelfde blijft (bij een andere uitkomst begint de kracht opnieuw).
 * Non-fataal van opzet: leren mag de hoofdactie nooit laten falen.
 */
export async function recordLearnedRule(
  supabase: SupabaseClient,
  userId: string,
  domain: string,
  pattern: string,
  value: string,
): Promise<void> {
  const p = normalizePattern(pattern);
  if (!p || !value) return;

  const { data: existing } = await supabase
    .from("learned_rules")
    .select("id, value, strength")
    .eq("user_id", userId)
    .eq("domain", domain)
    .eq("pattern", p)
    .maybeSingle();

  if (existing) {
    const sameValue = existing.value === value;
    await supabase
      .from("learned_rules")
      .update({
        value,
        strength: sameValue ? (existing.strength ?? 1) + 1 : 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("learned_rules")
      .insert({ user_id: userId, domain, pattern: p, value, strength: 1 });
  }
}

export async function getLearnedRules(
  supabase: SupabaseClient,
  userId: string,
  domain: string,
): Promise<LearnedRuleRow[]> {
  const { data } = await supabase
    .from("learned_rules")
    .select("pattern, value, strength")
    .eq("user_id", userId)
    .eq("domain", domain);
  return (data ?? []) as LearnedRuleRow[];
}

/**
 * Past een geleerde regel toe via de veiligheidspoort. Geeft de geleerde waarde
 * terug bij `execute`; bij `propose`/`block`/geen-match → null (niets doen).
 */
export async function applyLearnedRule(
  supabase: SupabaseClient,
  userId: string,
  domain: string,
  key: string,
  ctx: DispatchContext = DEFAULT_CTX,
): Promise<string | null> {
  const rules = await getLearnedRules(supabase, userId, domain);
  const decision = decideLearnedRuleApplication(rules, key, ctx);
  if (decision && decision.decision.decision === "execute") {
    return decision.match.rule.value;
  }
  return null;
}
