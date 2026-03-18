// ─── Tax calculation utilities (pure functions) ───

import type { SafeToSpendData } from "@/lib/types";

export const INCOME_TAX_RATE = 0.37;
export const TAX_SHIELD_THRESHOLD = 10000;
export const TAX_SHIELD_SAVINGS = 370;

/**
 * Simplified Dutch income tax estimate for ZZP'ers.
 */
export function estimateIncomeTax(revenueExVat: number): number {
  return Math.max(0, Math.round(revenueExVat * INCOME_TAX_RATE * 100) / 100);
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
