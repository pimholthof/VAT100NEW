/**
 * Wettelijke Rente Calculator (Nederland)
 *
 * Berekent de wettelijke handelsrente over openstaande facturen.
 * Tarief 2026: 10,5% per jaar (handelsovereenkomsten).
 * Bron: Besluit wettelijke rente.
 */

import { MS_PER_DAY } from "@/lib/constants/time";
import { todayIso } from "@/lib/utils/date-helpers";

const WETTELIJKE_HANDELSRENTE_JAARLIJKS = 0.105; // 10.5% per jaar

/**
 * Bereken wettelijke rente over een openstaand bedrag.
 */
export function calculateLegalInterest(
  principalAmount: number,
  dueDate: string,
  calculationDate: string = todayIso()
): {
  daysOverdue: number;
  interestAmount: number;
  totalOwed: number;
  dailyRate: number;
} {
  const due = new Date(dueDate);
  const calc = new Date(calculationDate);
  const daysOverdue = Math.max(0, Math.floor((calc.getTime() - due.getTime()) / MS_PER_DAY));

  const dailyRate = WETTELIJKE_HANDELSRENTE_JAARLIJKS / 365;
  const interestAmount =
    Math.round(principalAmount * dailyRate * daysOverdue * 100) / 100;
  const totalOwed = Math.round((principalAmount + interestAmount) * 100) / 100;

  return {
    daysOverdue,
    interestAmount,
    totalOwed,
    dailyRate,
  };
}
