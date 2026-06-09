/**
 * Reserve Recalculator
 *
 * Herberekent "hoeveel is echt van mij?" na elke transactie-classificatie,
 * banksync of handmatige trigger. Schrijft een snapshot naar reserve_snapshots
 * zodat het dashboard niet elke keer live hoeft te berekenen.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { type Investment } from "@/lib/tax/dutch-tax-2026";
import { computeReserve } from "@/lib/logic/reserve";
import { receiptCostExVat } from "@/lib/logic/receipt-cost";

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

    // 2. IB-schatting via jaaromzet + werkelijke kosten
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
    const huidigJaar = now.getFullYear();
    const yearStart = `${huidigJaar}-01-01`;
    const yearEnd = `${huidigJaar}-12-31`;
    const maandenVerstreken = now.getMonth() + 1;

    // Haal werkelijke kosten en investeringen op (parallel)
    const [regularReceiptsRes, investmentReceiptsRes] = await Promise.all([
      supabase
        .from("receipts")
        .select("amount_ex_vat, amount_inc_vat, vat_amount, vat_rate")
        .eq("user_id", userId)
        .gte("receipt_date", yearStart)
        .lte("receipt_date", yearEnd)
        .or("cost_code.is.null,cost_code.neq.4230"),
      supabase
        .from("receipts")
        .select("id, vendor_name, amount_ex_vat, receipt_date")
        .eq("user_id", userId)
        .eq("cost_code", 4230)
        .not("amount_ex_vat", "is", null)
        .not("receipt_date", "is", null),
    ]);

    const jaarKostenExBtw = (regularReceiptsRes.data ?? []).reduce(
      (sum, rec) => sum + receiptCostExVat(rec),
      0
    );

    const investeringen: Investment[] = (investmentReceiptsRes.data ?? []).map(
      (rec) => ({
        id: rec.id,
        omschrijving: rec.vendor_name ?? "Investering",
        aanschafprijs: Number(rec.amount_ex_vat) || 0,
        aanschafDatum: rec.receipt_date!,
        levensduur: 5,
        restwaarde: 0,
      })
    );

    // 3. Eén canonieke reserve-formule (gedeeld met het dashboard).
    const reserve = computeReserve({
      currentBalance: bankBalance,
      jaarOmzetExBtw: totalRevenueExVat,
      jaarKostenExBtw,
      investeringen,
      maandenVerstreken,
      outputVat,
      inputVat,
    });

    // 4. Schrijf snapshot
    await supabase.from("reserve_snapshots").insert({
      user_id: userId,
      bank_balance: reserve.currentBalance,
      estimated_vat: reserve.estimatedVat,
      estimated_income_tax: reserve.estimatedIncomeTax,
      reserved_total: reserve.reservedTotal,
      safe_to_spend: reserve.safeToSpend,
      trigger_type: triggerType,
      trigger_transaction_id: triggerTransactionId ?? null,
    });
  } catch {
    // Non-blocking: fouten zijn niet fataal
  }
}
