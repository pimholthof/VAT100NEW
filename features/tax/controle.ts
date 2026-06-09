"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, InvoiceStatus, VatScheme } from "@/lib/types";
import {
  runSelfChecks,
  invariantsHold,
  highestSeverity,
  countAutoFixable,
  type ControlFinding,
  type ControlSeverity,
} from "@/lib/logic/self-checks";
import { computeVatReturnRow } from "@/lib/tax/vat-return-row";
import type { InvoiceForBtw, ReceiptForBtw } from "@/lib/tax/btw-rubrieken";

export interface ControleResult {
  findings: ControlFinding[];
  highestSeverity: ControlSeverity | null;
  autoFixableCount: number;
  /** Geen kritieke bevinding → autonome mutaties zijn veilig (voedt de poort). */
  invariantsOk: boolean;
}

function mostRecentEndedQuarter(now: Date): { year: number; quarter: number } {
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  if (m <= 3) return { year: y - 1, quarter: 4 };
  if (m <= 6) return { year: y, quarter: 1 };
  if (m <= 9) return { year: y, quarter: 2 };
  return { year: y, quarter: 3 };
}

function quarterRange(year: number, quarter: number): { start: string; end: string } {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const start = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(year, endMonth, 0).getDate();
  const end = `${year}-${String(endMonth).padStart(2, "0")}-${lastDay}`;
  return { start, end };
}

interface InvoiceRow {
  id: string;
  status: string | null;
  due_date: string | null;
  issue_date: string | null;
  subtotal_ex_vat: number | null;
  vat_amount: number | null;
  vat_rate: number | null;
  total_inc_vat: number | null;
  vat_scheme: string | null;
  is_credit_note: boolean | null;
  invoice_lines?: { amount: number | null; vat_rate: number | null }[] | null;
  client?: { btw_number: string | null } | { btw_number: string | null }[] | null;
}

function clientBtw(c: InvoiceRow["client"]): string | null {
  if (!c) return null;
  if (Array.isArray(c)) return c[0]?.btw_number ?? null;
  return c.btw_number ?? null;
}

/**
 * Draait de controle-laag (`runSelfChecks`) live over de administratie van de
 * gebruiker. Voedt zowel een admin-controletoren als de invariant-gate van de
 * veiligheidspoort (`invariantsOk`). Puur additief; faalt niet de hoofdflows.
 */
export async function getControleBevindingen(): Promise<ActionResult<ControleResult>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const huidigJaar = now.getFullYear();
  const yearStart = `${huidigJaar}-01-01`;
  const yearEnd = `${huidigJaar}-12-31`;

  const [invoicesRes, receiptsRes, txRes, returnsRes, snapshotRes] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, status, due_date, issue_date, subtotal_ex_vat, vat_amount, vat_rate, total_inc_vat, vat_scheme, is_credit_note, invoice_lines(amount, vat_rate), client:clients(btw_number)",
      )
      .eq("user_id", user.id)
      .is("archived_at", null),
    supabase
      .from("receipts")
      .select("id, amount_ex_vat, vat_rate, vat_amount, vendor_name, receipt_date, business_percentage")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .gte("receipt_date", yearStart)
      .lte("receipt_date", yearEnd),
    supabase
      .from("bank_transactions")
      .select("id, amount, is_income, linked_invoice_id")
      .eq("user_id", user.id),
    supabase.from("vat_returns").select("year, quarter").eq("user_id", user.id),
    supabase
      .from("reserve_snapshots")
      .select("bank_balance, reserved_total")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (invoicesRes.error) return { error: invoicesRes.error.message };

  const invoices = (invoicesRes.data ?? []) as unknown as InvoiceRow[];
  const receipts = (receiptsRes.data ?? []) as Array<{
    id: string;
    amount_ex_vat: number | null;
    vat_rate: number | null;
    vat_amount: number | null;
    vendor_name: string | null;
    receipt_date: string | null;
    business_percentage: number | null;
  }>;
  const transactions = (txRes.data ?? []) as Array<{
    id: string;
    amount: number | null;
    is_income: boolean | null;
    linked_invoice_id: string | null;
  }>;
  const vatReturns = (returnsRes.data ?? []) as Array<{ year: number; quarter: number }>;

  const linkedInvoiceIds = new Set(
    transactions.map((t) => t.linked_invoice_id).filter((x): x is string => !!x),
  );

  // ── BTW: meest recente afgesloten kwartaal (voor de "voorbereid?"-controle) ──
  const { year: vYear, quarter: vQuarter } = mostRecentEndedQuarter(now);
  const { start: qStart, end: qEnd } = quarterRange(vYear, vQuarter);
  const qInvoices = invoices.filter(
    (i) =>
      (i.status === "sent" || i.status === "paid") &&
      i.issue_date != null &&
      i.issue_date >= qStart &&
      i.issue_date <= qEnd,
  );
  const qReceipts = receipts.filter(
    (r) => r.receipt_date != null && r.receipt_date >= qStart && r.receipt_date <= qEnd,
  );
  const vatComputation = computeVatReturnRow(
    qInvoices as unknown as InvoiceForBtw[],
    qReceipts as unknown as ReceiptForBtw[],
  );
  const deadline = new Date(vYear, vQuarter * 3 + 1, 0);
  const vatDaysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000);
  const preparedForQuarter = vatReturns.some((r) => r.year === vYear && r.quarter === vQuarter);

  const snapshot = snapshotRes.data;
  const reserve = snapshot
    ? {
        reservedTotal: Number(snapshot.reserved_total) || 0,
        currentBalance: Number(snapshot.bank_balance) || 0,
      }
    : null;

  const findings = runSelfChecks({
    today,
    invoices: invoices.map((i) => ({
      id: i.id,
      status: (i.status ?? "draft") as InvoiceStatus,
      due_date: i.due_date,
      total_inc_vat: Number(i.total_inc_vat) || 0,
      vat_scheme: (i.vat_scheme ?? "standard") as VatScheme,
      client_btw_number: clientBtw(i.client),
      matched_tx: linkedInvoiceIds.has(i.id),
    })),
    receipts: receipts.map((r) => ({
      id: r.id,
      amount_ex_vat: r.amount_ex_vat != null ? Number(r.amount_ex_vat) : null,
      vat_rate: r.vat_rate != null ? Number(r.vat_rate) : null,
      vendor_name: r.vendor_name,
      receipt_date: r.receipt_date,
    })),
    transactions: transactions.map((t) => ({
      id: t.id,
      amount: Number(t.amount) || 0,
      is_income: !!t.is_income,
      linked_invoice_id: t.linked_invoice_id,
    })),
    vat: {
      daysRemaining: vatDaysRemaining,
      estimatedAmount: vatComputation.teBetalen,
      preparedForQuarter,
    },
    reserve,
  });

  return {
    error: null,
    data: {
      findings,
      highestSeverity: highestSeverity(findings),
      autoFixableCount: countAutoFixable(findings),
      invariantsOk: invariantsHold(findings),
    },
  };
}
