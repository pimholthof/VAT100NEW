// ─── Tax calculation utilities (pure functions) ───
// Dutch IB 2025 brackets + ZZP deductions per CLAUDE.md

import type { SafeToSpendData } from "@/lib/types";

// ─── IB 2025 schijven ───

const IB_BRACKETS: { limit: number; rate: number }[] = [
  { limit: 38441, rate: 0.3582 },
  { limit: 76817, rate: 0.3748 },
  { limit: Infinity, rate: 0.495 },
];

const ZELFSTANDIGENAFTREK = 7390;
const MKB_WINSTVRIJSTELLING_RATE = 0.1331;

// Heffingskorting 2025: max €3.362, afbouw boven €24.814
const HEFFINGSKORTING_MAX = 3362;
const HEFFINGSKORTING_AFBOUW_START = 24814;
const HEFFINGSKORTING_AFBOUW_RATE = 0.06630; // afbouw per euro boven drempel

export const TAX_SHIELD_THRESHOLD = 10000;
export const TAX_SHIELD_SAVINGS = 370;

/**
 * Berekent bruto IB over een belastbaar inkomen (progressieve schijven).
 */
function calculateBrutoIB(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  let remaining = taxableIncome;
  let tax = 0;
  let prevLimit = 0;

  for (const bracket of IB_BRACKETS) {
    const bracketSize = bracket.limit - prevLimit;
    const taxableInBracket = Math.min(remaining, bracketSize);
    tax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
    prevLimit = bracket.limit;
    if (remaining <= 0) break;
  }

  return tax;
}

/**
 * Berekent heffingskorting 2025.
 */
function calculateHeffingskorting(taxableIncome: number): number {
  if (taxableIncome <= HEFFINGSKORTING_AFBOUW_START) {
    return HEFFINGSKORTING_MAX;
  }
  const reduction = (taxableIncome - HEFFINGSKORTING_AFBOUW_START) * HEFFINGSKORTING_AFBOUW_RATE;
  return Math.max(0, HEFFINGSKORTING_MAX - reduction);
}

/**
 * Schat de netto IB voor een ZZP'er (eenmanszaak) in 2025.
 *
 * @param revenueExVat  Jaaromzet excl. BTW
 * @param costs         Jaarlijkse zakelijke kosten excl. BTW (default 0)
 * @param useZelfstandigenaftrek  Of zelfstandigenaftrek van toepassing is (default true)
 */
export function estimateIncomeTax(
  revenueExVat: number,
  costs: number = 0,
  useZelfstandigenaftrek: boolean = true
): number {
  const winst = Math.max(0, revenueExVat - costs);

  // Zelfstandigenaftrek
  const za = useZelfstandigenaftrek ? Math.min(ZELFSTANDIGENAFTREK, winst) : 0;
  const winstNaZA = winst - za;

  // MKB-winstvrijstelling: 13,31% van winst na zelfstandigenaftrek
  const mkbVrijstelling = winstNaZA * MKB_WINSTVRIJSTELLING_RATE;
  const belastbaarInkomen = Math.max(0, winstNaZA - mkbVrijstelling);

  // Bruto IB via progressieve schijven
  const brutoIB = calculateBrutoIB(belastbaarInkomen);

  // Heffingskorting
  const korting = calculateHeffingskorting(belastbaarInkomen);

  return Math.max(0, Math.round((brutoIB - korting) * 100) / 100);
}

/**
 * Calculates the "safe to spend" amount after reserving for VAT and income tax.
 */
export function calculateSafeToSpend(
  bankTransactions: Array<{ amount: number }>,
  yearRevenue: Array<{ total_inc_vat: number; vat_amount: number }>,
  outputVat: number,
  inputVat: number
): SafeToSpendData {
  const currentBalance = bankTransactions.reduce(
    (sum, tx) => sum + (Number(tx.amount) || 0), 0
  );

  const estimatedVat = Math.max(0, Math.round((outputVat - inputVat) * 100) / 100);

  const totalRevenueExVat = yearRevenue.reduce(
    (sum, inv) => sum + ((Number(inv.total_inc_vat) || 0) - (Number(inv.vat_amount) || 0)), 0
  );
  const estimatedIncomeTax = estimateIncomeTax(totalRevenueExVat);

  const reservedTotal = estimatedVat + estimatedIncomeTax;
  const safeToSpend = Math.round((currentBalance - reservedTotal) * 100) / 100;

  const taxShieldPotential = totalRevenueExVat > TAX_SHIELD_THRESHOLD ? TAX_SHIELD_SAVINGS : 0;

  return {
    currentBalance: Math.round(currentBalance * 100) / 100,
    estimatedVat,
    estimatedIncomeTax,
    reservedTotal: Math.round(reservedTotal * 100) / 100,
    safeToSpend: Math.max(0, safeToSpend),
    taxShieldPotential,
  };
}
