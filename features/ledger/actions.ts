"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, LedgerEntry } from "@/lib/types";
import {
  getAccountName,
  isRepresentatie,
  getRevenueAccountCode,
} from "@/lib/tax/chart-of-accounts";

// ── Read ledger entries ──

export async function getLedgerEntries(filters?: {
  dateFrom?: string;
  dateTo?: string;
  accountCode?: number;
}): Promise<ActionResult<LedgerEntry[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  let query = supabase
    .from("ledger_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("entry_date", { ascending: false })
    .limit(500);

  if (filters?.dateFrom) query = query.gte("entry_date", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("entry_date", filters.dateTo);
  if (filters?.accountCode) query = query.eq("account_code", filters.accountCode);

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { error: null, data: (data ?? []) as LedgerEntry[] };
}

// ── Winst & Verlies overzicht ──

export interface ProfitAndLoss {
  year: number;
  revenue: { accountCode: number; accountName: string; total: number }[];
  expenses: { accountCode: number; accountName: string; total: number }[];
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
}

export async function getProfitAndLoss(year: number): Promise<ActionResult<ProfitAndLoss>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const { data, error } = await supabase
    .from("ledger_entries")
    .select("account_code, account_name, debit, credit")
    .eq("user_id", user.id)
    .gte("entry_date", yearStart)
    .lte("entry_date", yearEnd);

  if (error) return { error: error.message };

  const accountTotals = new Map<number, { name: string; debit: number; credit: number }>();

  for (const entry of data ?? []) {
    const code = entry.account_code;
    const existing = accountTotals.get(code) ?? { name: entry.account_name, debit: 0, credit: 0 };
    existing.debit += Number(entry.debit) || 0;
    existing.credit += Number(entry.credit) || 0;
    accountTotals.set(code, existing);
  }

  const revenue: ProfitAndLoss["revenue"] = [];
  const expenses: ProfitAndLoss["expenses"] = [];

  for (const [code, totals] of accountTotals) {
    if (code >= 8000 && code < 9000) {
      // Revenue: credit side
      revenue.push({
        accountCode: code,
        accountName: totals.name,
        total: Math.round((totals.credit - totals.debit) * 100) / 100,
      });
    } else if (code >= 4000 && code < 5000) {
      // Expenses: debit side
      expenses.push({
        accountCode: code,
        accountName: totals.name,
        total: Math.round((totals.debit - totals.credit) * 100) / 100,
      });
    }
  }

  revenue.sort((a, b) => a.accountCode - b.accountCode);
  expenses.sort((a, b) => a.accountCode - b.accountCode);

  const totalRevenue = Math.round(revenue.reduce((s, r) => s + r.total, 0) * 100) / 100;
  const totalExpenses = Math.round(expenses.reduce((s, e) => s + e.total, 0) * 100) / 100;

  return {
    error: null,
    data: {
      year,
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      grossProfit: Math.round((totalRevenue - totalExpenses) * 100) / 100,
    },
  };
}

// ── Create ledger entries for a receipt ──

export async function createReceiptLedgerEntries(
  userId: string,
  receiptId: string,
  entryDate: string,
  description: string,
  costCode: number | null,
  amountExVat: number,
  vatAmount: number,
): Promise<ActionResult<{ created: number }>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase } = auth;

  const round2 = (v: number) => Math.round(v * 100) / 100;
  const entries: Partial<LedgerEntry>[] = [];
  const accountCode = costCode ?? 4999;
  const accountName = getAccountName(accountCode);

  if (isRepresentatie(costCode)) {
    // 80/20 split: 80% aftrekbaar, 20% niet-aftrekbaar
    const deductible = round2(amountExVat * 0.8);
    const nonDeductible = round2(amountExVat * 0.2);

    // 80% aftrekbaar deel
    entries.push({
      user_id: userId,
      entry_date: entryDate,
      description: `${description} (80% aftrekbaar)`,
      account_code: accountCode,
      account_name: accountName,
      debit: deductible,
      credit: 0,
      receipt_id: receiptId,
      vat_amount: round2(vatAmount * 0.8),
      is_representatie: true,
      split_percentage: 80,
    });

    // 20% niet-aftrekbaar deel
    entries.push({
      user_id: userId,
      entry_date: entryDate,
      description: `${description} (20% niet-aftrekbaar)`,
      account_code: accountCode,
      account_name: accountName,
      debit: nonDeductible,
      credit: 0,
      receipt_id: receiptId,
      vat_amount: round2(vatAmount * 0.2),
      is_representatie: true,
      split_percentage: 20,
    });
  } else {
    // Normal expense entry
    entries.push({
      user_id: userId,
      entry_date: entryDate,
      description,
      account_code: accountCode,
      account_name: accountName,
      debit: round2(amountExVat),
      credit: 0,
      receipt_id: receiptId,
      vat_amount: round2(vatAmount),
      is_representatie: false,
      split_percentage: 100,
    });
  }

  // BTW te vorderen entry (if any VAT)
  if (vatAmount > 0) {
    entries.push({
      user_id: userId,
      entry_date: entryDate,
      description: `BTW ${description}`,
      account_code: 1300,
      account_name: "BTW te vorderen",
      debit: round2(vatAmount),
      credit: 0,
      receipt_id: receiptId,
      vat_amount: 0,
      is_representatie: false,
      split_percentage: 100,
    });
  }

  // Crediteuren (credit side — total inc VAT)
  entries.push({
    user_id: userId,
    entry_date: entryDate,
    description: `Crediteur ${description}`,
    account_code: 2000,
    account_name: "Crediteuren",
    debit: 0,
    credit: round2(amountExVat + vatAmount),
    receipt_id: receiptId,
    vat_amount: 0,
    is_representatie: false,
    split_percentage: 100,
  });

  const { error } = await supabase.from("ledger_entries").insert(entries);
  if (error) return { error: error.message };
  return { error: null, data: { created: entries.length } };
}

// ── Create ledger entries for an invoice ──

export async function createInvoiceLedgerEntries(
  userId: string,
  invoiceId: string,
  entryDate: string,
  description: string,
  subtotalExVat: number,
  vatAmount: number,
  vatScheme: "standard" | "eu_reverse_charge" | "export_outside_eu",
): Promise<ActionResult<{ created: number }>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase } = auth;

  const round2 = (v: number) => Math.round(v * 100) / 100;
  const revenueCode = getRevenueAccountCode(vatScheme);
  const revenueAccountName = getAccountName(revenueCode);

  const entries: Partial<LedgerEntry>[] = [];

  // Debiteur (debit — total inc VAT)
  entries.push({
    user_id: userId,
    entry_date: entryDate,
    description: `Debiteur ${description}`,
    account_code: 1100,
    account_name: "Debiteuren",
    debit: round2(subtotalExVat + vatAmount),
    credit: 0,
    invoice_id: invoiceId,
    vat_amount: 0,
    is_representatie: false,
    split_percentage: 100,
  });

  // Omzet (credit — subtotal ex VAT)
  entries.push({
    user_id: userId,
    entry_date: entryDate,
    description,
    account_code: revenueCode,
    account_name: revenueAccountName,
    debit: 0,
    credit: round2(subtotalExVat),
    invoice_id: invoiceId,
    vat_amount: 0,
    is_representatie: false,
    split_percentage: 100,
  });

  // BTW te betalen (credit — VAT amount, only for standard scheme)
  if (vatAmount > 0 && vatScheme === "standard") {
    entries.push({
      user_id: userId,
      entry_date: entryDate,
      description: `BTW ${description}`,
      account_code: 2100,
      account_name: "BTW te betalen",
      debit: 0,
      credit: round2(vatAmount),
      invoice_id: invoiceId,
      vat_amount: round2(vatAmount),
      is_representatie: false,
      split_percentage: 100,
    });
  }

  const { error } = await supabase.from("ledger_entries").insert(entries);
  if (error) return { error: error.message };
  return { error: null, data: { created: entries.length } };
}

// ── Delete ledger entries for a source document ──

export async function deleteLedgerEntriesForReceipt(receiptId: string): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("ledger_entries")
    .delete()
    .eq("user_id", user.id)
    .eq("receipt_id", receiptId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteLedgerEntriesForInvoice(invoiceId: string): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("ledger_entries")
    .delete()
    .eq("user_id", user.id)
    .eq("invoice_id", invoiceId);

  if (error) return { error: error.message };
  return { error: null };
}
