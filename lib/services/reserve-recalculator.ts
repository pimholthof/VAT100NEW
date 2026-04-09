/**
 * Reserve Recalculator
 *
 * Herberekent "hoeveel is echt van mij?" na elke transactie-classificatie,
 * banksync of handmatige trigger. Schrijft een snapshot naar reserve_snapshots
 * zodat het dashboard niet elke keer live hoeft te berekenen.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { calculateZZPTaxProjection } from "@/lib/tax/dutch-tax-2026";

/**
 * Herbereken reserves en schrijf een snapshot.
 * Non-blocking: fouten worden stil opgegeten.
 */
export async function recalculateReserves(
  userId: string,
  triggerType: "classification" | "sync" | "manual",
  triggerTransactionId?: string
): Promise<void> {
  try {
    const supabase = createServiceClient();

    // 1. Bankbalans: som van alle transacties
    const { data: balanceData } = await supabase.rpc("get_dashboard_stats", {
      p_user_id: userId,
    });

    const bankBalance = Number(balanceData?.bankBalance) || 0;
    const outputVat = Number(balanceData?.outputVat) || 0;
    const inputVat = Number(balanceData?.inputVat) || 0;

    // 2. BTW-reservering
    const estimatedVat = Math.max(
      0,
      Math.round((outputVat - inputVat) * 100) / 100
    );

    // 3. IB-schatting via jaaromzet
    const yearRevenueRecords = (balanceData?.yearRevenueRecords ?? []) as Array<{
      total_inc_vat: number;
      vat_amount: number;
    }>;
    const totalRevenueExVat = yearRevenueRecords.reduce(
      (sum, inv) =>
        sum + ((Number(inv.total_inc_vat) || 0) - (Number(inv.vat_amount) || 0)),
      0
    );

    const now = new Date();
    const maandenVerstreken = now.getMonth() + 1;
    const projection = calculateZZPTaxProjection({
      jaarOmzetExBtw: totalRevenueExVat,
      jaarKostenExBtw: 0,
      investeringen: [],
      maandenVerstreken,
    });

    const estimatedIncomeTax = Math.max(0, projection.nettoIB);
    const reservedTotal = estimatedVat + estimatedIncomeTax;
    const safeToSpend = Math.max(
      0,
      Math.round((bankBalance - reservedTotal) * 100) / 100
    );

    // 4. Schrijf snapshot
    await supabase.from("reserve_snapshots").insert({
      user_id: userId,
      bank_balance: Math.round(bankBalance * 100) / 100,
      estimated_vat: estimatedVat,
      estimated_income_tax: Math.round(estimatedIncomeTax * 100) / 100,
      reserved_total: Math.round(reservedTotal * 100) / 100,
      safe_to_spend: safeToSpend,
      trigger_type: triggerType,
      trigger_transaction_id: triggerTransactionId ?? null,
    });
  } catch {
    // Non-blocking: fouten zijn niet fataal
  }
}
