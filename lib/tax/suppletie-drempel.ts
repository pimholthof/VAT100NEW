/**
 * Suppletie-drempel — wanneer mag een btw-correctie in de eerstvolgende
 * aangifte in plaats van via een aparte suppletie?
 *
 * Regel (art. 15 Uitv.besl. OB / toelichting Belastingdienst): is het te
 * betalen of terug te vragen verschil € 1.000 of minder, dan mag je het
 * verwerken in je eerstvolgende btw-aangifte; een aparte suppletie is dan
 * niet verplicht. Daarboven is een suppletie verplicht.
 *
 * Bewust puur (geen server- of React-imports) zodat de check zowel op de
 * server als live in de client draait.
 */

import { roundMoney } from "@/lib/logic/invoice-calculations";

/** Drempelbedrag: t/m € 1.000 verschil mag in de eerstvolgende aangifte. */
export const SUPPLETIE_DREMPEL = 1_000;

/** De hint die het scherm toont wanneer het verschil binnen de drempel valt. */
export const SUPPLETIE_DREMPEL_HINT =
  "Verschil van € 1.000 of minder? Dan mag je dit verwerken in je eerstvolgende btw-aangifte — een aparte suppletie is niet nodig.";

export interface SuppletieDrempelCheck {
  /** Gecorrigeerd − origineel netto te betalen BTW (negatief = teruggave). */
  verschil: number;
  /** True wanneer er iets te corrigeren valt én |verschil| ≤ € 1.000. */
  binnenDrempel: boolean;
}

/**
 * Vergelijk de oorspronkelijke en gecorrigeerde netto-BTW (verschuldigd −
 * voorbelasting) en bepaal of het verschil binnen de € 1.000-drempel valt.
 */
export function checkSuppletieDrempel(
  origineelNetto: number,
  gecorrigeerdNetto: number,
): SuppletieDrempelCheck {
  const origineel = Number.isFinite(origineelNetto) ? origineelNetto : 0;
  const gecorrigeerd = Number.isFinite(gecorrigeerdNetto) ? gecorrigeerdNetto : 0;
  const verschil = roundMoney(gecorrigeerd - origineel);
  return {
    verschil,
    binnenDrempel: verschil !== 0 && Math.abs(verschil) <= SUPPLETIE_DREMPEL,
  };
}
