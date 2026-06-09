/**
 * Reserve — de éne, canonieke "hoeveel is van jou?"-formule.
 *
 * Eén bron voor zowel het dashboard (live/fallback) als de reserve-recalculator
 * (snapshot). Zo kan "veilig te besteden" nergens nog van zichzelf afwijken.
 *
 * BTW-reservering = output − input (≥ 0). IB-reservering = inkomstenbelasting +
 * inkomensafhankelijke bijdrage Zvw, via de geverifieerde 2026-projectie over
 * werkelijke omzet, kosten en investeringen. Veilig te besteden = saldo − beide
 * reserveringen (≥ 0). Puur en deterministisch.
 */

import type { SafeToSpendData } from "@/lib/types";
import { roundMoney } from "@/lib/logic/invoice-calculations";
import {
  calculateZZPTaxProjection,
  calculateKIA,
  getMarginalRate,
  type Investment,
} from "@/lib/tax/dutch-tax-2026";

export interface ReserveInput {
  /** Banksaldo nu. */
  currentBalance: number;
  /** Jaaromzet ex. BTW (year-to-date). */
  jaarOmzetExBtw: number;
  /** Werkelijke aftrekbare kosten ex. BTW (year-to-date). */
  jaarKostenExBtw: number;
  /** Investeringen voor KIA + afschrijving. */
  investeringen: Investment[];
  /** Verstreken maanden van het boekjaar (1-12). */
  maandenVerstreken: number;
  /** Output-BTW (verschuldigd). */
  outputVat: number;
  /** Voorbelasting (terug te vorderen). */
  inputVat: number;
}

/** Voorbeeldinvestering voor de belastingvoordeel-potentie (boven de KIA-drempel). */
export const TAX_SHIELD_EXAMPLE_INVESTMENT = 3_000;

export function computeReserve(input: ReserveInput): SafeToSpendData {
  const estimatedVat = Math.max(0, roundMoney(input.outputVat - input.inputVat));

  const projection = calculateZZPTaxProjection({
    jaarOmzetExBtw: input.jaarOmzetExBtw,
    jaarKostenExBtw: input.jaarKostenExBtw,
    investeringen: input.investeringen,
    maandenVerstreken: input.maandenVerstreken,
  });

  // De IB-pot omvat inkomstenbelasting én de inkomensafhankelijke bijdrage Zvw —
  // samen "wat je voor de Belastingdienst opzij houdt". Zonder de Zvw zou "vrij
  // te besteden" voor een winst van €50–80k honderden tot duizenden euro's te
  // hoog staan.
  const estimatedIncomeTax = Math.max(0, roundMoney(projection.totaleHeffing));
  const reservedTotal = roundMoney(estimatedVat + estimatedIncomeTax);
  const safeToSpend = Math.max(0, roundMoney(input.currentBalance - reservedTotal));

  // Potentieel belastingvoordeel van een voorbeeld-investering (€1.000) tegen
  // het werkelijke marginale tarief — niet langer hardcoded.
  const taxShieldPotential =
    input.jaarOmzetExBtw > 10_000
      ? roundMoney(calculateKIA(TAX_SHIELD_EXAMPLE_INVESTMENT) * getMarginalRate(projection.belastbaarInkomen))
      : 0;

  return {
    currentBalance: roundMoney(input.currentBalance),
    estimatedVat,
    estimatedIncomeTax,
    reservedTotal,
    safeToSpend,
    taxShieldPotential,
  };
}
