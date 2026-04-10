"use server";

import { requireAuth, createClient } from "@/lib/supabase/server";
import type { ActionResult, LedgerEntry, LedgerEntryInput, LedgerAccount, VatScheme } from "@/lib/types";
import { getRevenueAccountCode } from "@/lib/tax/chart-of-accounts";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

// ─── Ledger Account Constants ───

const ACCOUNTS = {
  BANK: 1000,
  KAS: 1100,
  DEBITEUREN: 1300,
  CREDITEUREN: 1400,
  BTW_AF_TE_DRAGEN: 2100,
  BTW_TERUG_TE_VORDEREN: 2200,
  PRIVE: 3100,
  OMZET: 4000,
  REPRESENTATIE: 4500,
} as const;

/**
 * Create a ledger entry (journaalpost).
 */
export async function createLedgerEntry(
  input: LedgerEntryInput,
): Promise<ActionResult<LedgerEntry>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  if (input.amount <= 0) return { error: "Bedrag moet positief zijn." };

  const { data, error } = await supabase
    .from("ledger_entries")
    .insert({
      user_id: user.id,
      entry_date: input.entry_date,
      description: input.description,
      source_invoice_id: input.source_invoice_id ?? null,
      source_receipt_id: input.source_receipt_id ?? null,
      debit_account: input.debit_account,
      credit_account: input.credit_account,
      amount: input.amount,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data: data as LedgerEntry };
}

/**
 * Create multiple ledger entries at once (for split bookings).
 */
export async function createLedgerEntries(
  inputs: LedgerEntryInput[],
): Promise<ActionResult<LedgerEntry[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  for (const input of inputs) {
    if (input.amount <= 0) return { error: "Alle bedragen moeten positief zijn." };
  }

  const rows = inputs.map((input) => ({
    user_id: user.id,
    entry_date: input.entry_date,
    description: input.description,
    source_invoice_id: input.source_invoice_id ?? null,
    source_receipt_id: input.source_receipt_id ?? null,
    debit_account: input.debit_account,
    credit_account: input.credit_account,
    amount: input.amount,
  }));

  const { data, error } = await supabase
    .from("ledger_entries")
    .insert(rows)
    .select();

  if (error) return { error: error.message };
  return { error: null, data: (data ?? []) as LedgerEntry[] };
}

/**
 * Get ledger entries with optional filters.
 */
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
    .order("entry_date", { ascending: false });

  if (filters?.dateFrom) query = query.gte("entry_date", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("entry_date", filters.dateTo);
  if (filters?.accountCode) {
    query = query.or(`debit_account.eq.${filters.accountCode},credit_account.eq.${filters.accountCode}`);
  }

  const { data, error } = await query.limit(500);

  if (error) return { error: error.message };
  return { error: null, data: (data ?? []) as LedgerEntry[] };
}

/**
 * Get all ledger accounts (rekeningschema).
 */
export async function getLedgerAccounts(): Promise<ActionResult<LedgerAccount[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("ledger_accounts")
    .select("*")
    .order("code", { ascending: true });

  if (error) return { error: error.message };
  return { error: null, data: (data ?? []) as LedgerAccount[] };
}

/**
 * Delete a ledger entry.
 */
export async function deleteLedgerEntry(id: string): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("ledger_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

// ─── Helper: Auto-book receipt to ledger ───

export async function autoBookReceipt(params: {
  receiptId: string;
  userId: string;
  entryDate: string;
  description: string;
  costCode: number;
  amountExVat: number;
  vatAmount: number;
  businessPercentage: number;
  category: string | null;
  supabase: SupabaseServer;
}): Promise<void> {
  const {
    receiptId, userId, entryDate, description,
    costCode, amountExVat, vatAmount, businessPercentage, category, supabase,
  } = params;

  const round2 = (v: number) => Math.round(v * 100) / 100;
  const totalIncVat = round2(amountExVat + vatAmount);

  // Representatie (4500) or "Eten & drinken horeca" → 80/20 split
  const isRepresentatie = costCode === 4500 || category === "Representatie";
  const isHoreca = category === "Eten & drinken horeca" || category === "Eten & drinken zakelijk";

  // For horeca: force deductible VAT to 0
  const effectiveVat = isHoreca ? 0 : round2(vatAmount * (businessPercentage / 100));

  type ReceiptEntry = {
    user_id: string;
    entry_date: string;
    description: string;
    source_receipt_id: string;
    debit_account: number;
    credit_account: number;
    amount: number;
  };

  if (isRepresentatie) {
    // 80% business costs
    const businessAmount = round2(totalIncVat * 0.8);
    // 20% privé
    const priveAmount = round2(totalIncVat * 0.2);

    const entries: ReceiptEntry[] = [
      {
        user_id: userId,
        entry_date: entryDate,
        description: `${description} (80% zakelijk)`,
        source_receipt_id: receiptId,
        debit_account: costCode || ACCOUNTS.REPRESENTATIE,
        credit_account: ACCOUNTS.BANK,
        amount: businessAmount,
      },
      {
        user_id: userId,
        entry_date: entryDate,
        description: `${description} (20% privé)`,
        source_receipt_id: receiptId,
        debit_account: ACCOUNTS.PRIVE,
        credit_account: ACCOUNTS.BANK,
        amount: priveAmount,
      },
    ];

    // BTW entry (if applicable and not horeca)
    if (effectiveVat > 0) {
      entries.push({
        user_id: userId,
        entry_date: entryDate,
        description: `BTW voorbelasting: ${description}`,
        source_receipt_id: receiptId,
        debit_account: ACCOUNTS.BTW_TERUG_TE_VORDEREN,
        credit_account: ACCOUNTS.BANK,
        amount: effectiveVat,
      });
    }

    await supabase.from("ledger_entries").insert(entries);
  } else {
    // Standard booking: cost to bank
    const entries: ReceiptEntry[] = [
      {
        user_id: userId,
        entry_date: entryDate,
        description,
        source_receipt_id: receiptId,
        debit_account: costCode || 4999,
        credit_account: ACCOUNTS.BANK,
        amount: round2(amountExVat * (businessPercentage / 100)),
      },
    ];

    if (effectiveVat > 0) {
      entries.push({
        user_id: userId,
        entry_date: entryDate,
        description: `BTW voorbelasting: ${description}`,
        source_receipt_id: receiptId,
        debit_account: ACCOUNTS.BTW_TERUG_TE_VORDEREN,
        credit_account: ACCOUNTS.BANK,
        amount: effectiveVat,
      });
    }

    await supabase.from("ledger_entries").insert(entries);
  }
}

// ─── Helper: Auto-book invoice to ledger ───

export async function autoBookInvoice(params: {
  invoiceId: string;
  userId: string;
  entryDate: string;
  description: string;
  subtotalExVat: number;
  vatAmount: number;
  vatScheme?: VatScheme;
  supabase: SupabaseServer;
}): Promise<void> {
  const { invoiceId, userId, entryDate, description, subtotalExVat, vatAmount, vatScheme, supabase } = params;
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const totalIncVat = round2(subtotalExVat + vatAmount);
  const revenueAccount = getRevenueAccountCode(vatScheme ?? "standard");

  const entries: Array<{
    user_id: string;
    entry_date: string;
    description: string;
    source_invoice_id: string;
    debit_account: number;
    credit_account: number;
    amount: number;
  }> = [
    // Debiteur aan Omzet (juiste omzetrekening op basis van BTW-regime)
    {
      user_id: userId,
      entry_date: entryDate,
      description,
      source_invoice_id: invoiceId,
      debit_account: ACCOUNTS.DEBITEUREN,
      credit_account: revenueAccount,
      amount: round2(subtotalExVat),
    },
  ];

  if (vatAmount > 0) {
    // Debiteur aan BTW af te dragen
    entries.push({
      user_id: userId,
      entry_date: entryDate,
      description: `BTW: ${description}`,
      source_invoice_id: invoiceId,
      debit_account: ACCOUNTS.DEBITEUREN,
      credit_account: ACCOUNTS.BTW_AF_TE_DRAGEN,
      amount: round2(vatAmount),
    });
  }

  void totalIncVat;

  await supabase.from("ledger_entries").insert(entries);
}
