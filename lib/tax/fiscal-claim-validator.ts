/**
 * Fiscal Claim Validator
 *
 * Centraal validatiepunt voor fiscale claims. Agents classificeren,
 * deze module rekent — nooit andersom.
 *
 * Bevat:
 * - Confidence drempels (human-in-the-loop)
 * - KIA/investering besparingsberekeningen (via dutch-tax-2026.ts)
 * - Audit score berekening
 * - Vraag-formulering helpers
 */

import {
  calculateKIA,
  calculateBox1Tax,
  TAX_CONSTANTS,
} from "./dutch-tax-2026";
import { formatCurrency } from "@/lib/format";

// ─── Confidence Drempels (vanuit centrale config) ───

import { CONFIDENCE_THRESHOLDS } from "@/lib/config/automation";
export { CONFIDENCE_THRESHOLDS };

// ─── KIA & Investering Berekeningen ───

export interface InvestmentTaxSaving {
  kiaDelta: number;
  taxSaving: number;
}

/**
 * Bereken de daadwerkelijke belastingbesparing van een investering.
 * Gebruikt calculateKIA en calculateBox1Tax — nooit hardcoded schattingen.
 */
export function calculateInvestmentTaxSaving(params: {
  currentTotalInvestments: number;
  proposedAdditionalInvestment: number;
  currentBelastbaarInkomen: number;
}): InvestmentTaxSaving {
  const { currentTotalInvestments, proposedAdditionalInvestment, currentBelastbaarInkomen } = params;

  const currentKIA = calculateKIA(currentTotalInvestments);
  const newKIA = calculateKIA(currentTotalInvestments + proposedAdditionalInvestment);
  const kiaDelta = round2(newKIA - currentKIA);

  if (kiaDelta <= 0 || currentBelastbaarInkomen <= 0) {
    return { kiaDelta: 0, taxSaving: 0 };
  }

  // Bereken marginale belastingbesparing via het verschil in IB
  const taxBefore = calculateBox1Tax(currentBelastbaarInkomen);
  const taxAfter = calculateBox1Tax(Math.max(0, currentBelastbaarInkomen - kiaDelta));
  const taxSaving = round2(taxBefore - taxAfter);

  return { kiaDelta, taxSaving };
}

export interface KIAThresholdGap {
  nodig: number;
  potentialKIA: number;
}

/**
 * Bereken hoeveel investering nodig is om de KIA-drempel te bereiken,
 * of hoeveel ruimte er nog is in de eerste KIA-schijf.
 */
export function calculateKIAThresholdGap(
  currentInvestments: number,
): KIAThresholdGap | null {
  const KIA_MIN = TAX_CONSTANTS.kiaMinTotal;

  // Onder de drempel: bereken hoeveel er nodig is
  if (currentInvestments > 0 && currentInvestments < KIA_MIN) {
    const nodig = round2(KIA_MIN - currentInvestments);
    const potentialKIA = calculateKIA(KIA_MIN);
    return { nodig, potentialKIA };
  }

  return null;
}

// ─── Audit Score ───

export type AuditStatus = "Gedaan" | "Aandacht Vereist" | "Kritiek";

export interface AuditScoreResult {
  score: number;
  status: AuditStatus;
}

/**
 * Deterministische audit score berekening.
 * Vervangt de inline logica in tax-auditor-agent.ts.
 */
export function calculateAuditScore(params: {
  missingReceiptsCount: number;
  unlinkedInvoicesCount: number;
  hoursLogged: number;
  targetHours: number;
}): AuditScoreResult {
  const { missingReceiptsCount, unlinkedInvoicesCount, hoursLogged, targetHours } = params;

  let score = 100;
  score -= missingReceiptsCount * 5;
  score -= unlinkedInvoicesCount * 2;
  if (hoursLogged < targetHours * 0.8) score -= 15;
  score = Math.max(0, score);

  const status: AuditStatus =
    score > 90 ? "Gedaan" : score > 70 ? "Aandacht Vereist" : "Kritiek";

  return { score, status };
}

// ─── Human-in-the-loop Helpers ───

/**
 * Wanneer confidence < 0.95, herschrijf de titel als een vraag.
 * Boven 0.95 wordt de originele titel ongewijzigd teruggegeven.
 */
export function toHumanReviewTitle(
  originalTitle: string,
  confidence: number,
): string {
  if (confidence >= CONFIDENCE_THRESHOLDS.HUMAN_REVIEW) return originalTitle;
  return `Vat100 denkt: ${originalTitle.charAt(0).toLowerCase()}${originalTitle.slice(1)} — klopt dat?`;
}

/**
 * Wanneer confidence < 0.95, voeg een controle-vraag toe aan de beschrijving.
 */
export function toHumanReviewDescription(
  originalDescription: string,
  confidence: number,
): string {
  if (confidence >= CONFIDENCE_THRESHOLDS.HUMAN_REVIEW) return originalDescription;
  return `${originalDescription}\n\nControleer en bevestig of negeer dit voorstel.`;
}

// ─── Confidence voor Missing Receipt Detection ───

/**
 * Variabele confidence voor ontbrekende bonnetjes op basis van bedrag.
 * Hogere bedragen = hogere zekerheid dat een bon echt nodig is.
 */
export function getMissingReceiptConfidence(amount: number): number {
  if (amount >= 100) return 0.95;
  if (amount >= 50) return 0.90;
  return CONFIDENCE_THRESHOLDS.KEYWORD_MATCH; // 0.85
}

// ─── Beschrijving Generators ───

/**
 * Genereer een betrouwbare KIA-drempel beschrijving met echte berekeningen.
 */
export function generateKIAThresholdDescription(
  totalInvestments: number,
  gap: KIAThresholdGap,
): string {
  return `Je totale investeringen zijn ${formatCurrency(totalInvestments)}. Investeer nog ${formatCurrency(gap.nodig)} om de KIA-drempel van €${TAX_CONSTANTS.kiaMinTotal.toLocaleString("nl-NL")} te bereiken en ${formatCurrency(gap.potentialKIA)} KIA-aftrek te krijgen.`;
}

/**
 * Genereer een betrouwbare investering-suggestie beschrijving met echte belastingbesparing.
 */
export function generateInvestmentSuggestionDescription(
  totalRevenueExVat: number,
  proposedInvestment: number,
  saving: InvestmentTaxSaving,
): string {
  return `Je hebt dit jaar al ${formatCurrency(totalRevenueExVat)} omgezet. Een investering van ${formatCurrency(proposedInvestment)} bespaart ${formatCurrency(saving.taxSaving)} aan inkomstenbelasting via de KIA (${formatCurrency(saving.kiaDelta)} aftrek).`;
}

// ─── Helpers ───

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
