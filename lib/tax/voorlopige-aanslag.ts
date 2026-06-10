/**
 * Voorlopige aanslag (VA) — beslishulp voor de IB/Zvw-aanslag.
 *
 * Zonder VA volgt de hele heffing als één bedrag ná het belastingjaar, en
 * rekent de Belastingdienst vanaf 1 juli van het jaar erop belastingrente
 * over wat dan nog openstaat. Deze module vertaalt de bestaande
 * jaarprognose (`totaleHeffing` = IB ná kortingen + Zvw — precies wat de
 * VA omvat) naar de enige beslissing die telt: aanvragen of niet, en
 * welk maandbedrag daarbij hoort.
 *
 * Puur en deterministisch; tijd komt als expliciete input binnen.
 */

import { roundMoney } from "@/lib/logic/invoice-calculations";

/** Belastingrente IB 2026 (zie docs/fiscal-constants-2026.md). */
export const BELASTINGRENTE_PERCENTAGE_2026 = 0.065;

/** Onder dit openstaande bedrag is een hint ruis, geen hulp. */
export const VA_MATERIALITEITSDREMPEL = 500;

export type VoorlopigeAanslagStatus = "geen" | "gedekt" | "deels" | "ongedekt";

export interface VoorlopigeAanslagInput {
  /** Verwachte totale heffing voor het jaar: IB ná kortingen + Zvw. */
  verwachteHeffing: number;
  /** Reeds betaalde VA-termijnen (tax_payments, type "ib") voor dat jaar. */
  vaBetaald: number;
  /** Het belastingjaar waarover geadviseerd wordt. */
  jaar: number;
  /** Het huidige kalenderjaar. */
  huidigJaar: number;
  /** Huidige maand als index 0–11 (alleen relevant voor het lopende jaar). */
  huidigeMaandIndex: number;
}

export interface VoorlopigeAanslagAdvies {
  status: VoorlopigeAanslagStatus;
  verwachteHeffing: number;
  vaBetaald: number;
  /** Wat er nog niet door VA-betalingen wordt gedekt (≥ 0). */
  openstaand: number;
  /** Maanden t/m december waarover het openstaande bedrag te spreiden is (huidige maand telt mee); 0 voor een afgelopen jaar. */
  resterendeMaanden: number;
  /** Openstaand gespreid over de resterende maanden, naar boven op hele euro's; 0 zonder resterende maanden. */
  maandbedrag: number;
  /** Indicatieve belastingrente over het openstaande bedrag, per maand. */
  renteRisicoPerMaand: number;
  /** True wanneer het belastingjaar voorbij is en belastingrente (gaat) tellen. */
  afgelopenJaar: boolean;
  /** True wanneer het openstaande bedrag groot genoeg is om een hint te tonen. */
  materieel: boolean;
}

function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function adviseerVoorlopigeAanslag(
  input: VoorlopigeAanslagInput,
): VoorlopigeAanslagAdvies {
  const verwachteHeffing = roundMoney(nonNegative(input.verwachteHeffing));
  const vaBetaald = roundMoney(nonNegative(input.vaBetaald));
  const openstaand = roundMoney(Math.max(0, verwachteHeffing - vaBetaald));

  const afgelopenJaar = input.jaar < input.huidigJaar;
  const resterendeMaanden = afgelopenJaar
    ? 0
    : input.jaar > input.huidigJaar
      ? 12
      : 12 - Math.min(11, Math.max(0, input.huidigeMaandIndex));

  const status: VoorlopigeAanslagStatus =
    verwachteHeffing <= 0
      ? "geen"
      : openstaand <= 0
        ? "gedekt"
        : vaBetaald > 0
          ? "deels"
          : "ongedekt";

  const maandbedrag =
    resterendeMaanden > 0 && openstaand > 0
      ? Math.ceil(openstaand / resterendeMaanden)
      : 0;

  const renteRisicoPerMaand = roundMoney(
    (openstaand * BELASTINGRENTE_PERCENTAGE_2026) / 12,
  );

  return {
    status,
    verwachteHeffing,
    vaBetaald,
    openstaand,
    resterendeMaanden,
    maandbedrag,
    renteRisicoPerMaand,
    afgelopenJaar,
    materieel: openstaand >= VA_MATERIALITEITSDREMPEL,
  };
}
