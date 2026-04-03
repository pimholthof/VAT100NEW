"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult, InvoiceStatus } from "@/lib/types";
import { sanitizeError } from "@/lib/errors";

// ─── Platform Invoices Overview ───

export interface PlatformInvoice {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  total_inc_vat: number;
  vat_amount: number;
  client_name: string;
  user_name: string;
  user_id: string;
  payment_method: string | null;
  mollie_payment_id: string | null;
  is_credit_note: boolean;
}

export interface PlatformInvoiceStats {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  totalRevenue: number;
  totalOpen: number;
  totalOverdue: number;
}

export async function getPlatformInvoices(filters?: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{ invoices: PlatformInvoice[]; total: number; stats: PlatformInvoiceStats }>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Get invoices with client and user info
    let query = supabase
      .from("invoices")
      .select("id, invoice_number, status, issue_date, due_date, total_inc_vat, vat_amount, is_credit_note, payment_method, mollie_payment_id, user_id, client:clients(name), user:profiles!invoices_user_id_fkey(full_name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      query = query.or(`invoice_number.ilike.${term}`);
    }

    const { data: invoices, count, error } = await query;
    if (error) return { error: sanitizeError(error, { action: "getPlatformInvoices" }) };

    // Get aggregate stats
    const { data: allInvoices } = await supabase
      .from("invoices")
      .select("status, total_inc_vat");

    const stats: PlatformInvoiceStats = {
      total: allInvoices?.length ?? 0,
      draft: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
      totalRevenue: 0,
      totalOpen: 0,
      totalOverdue: 0,
    };

    for (const inv of allInvoices ?? []) {
      const amount = Number(inv.total_inc_vat) || 0;
      if (inv.status === "draft") stats.draft++;
      if (inv.status === "sent") { stats.sent++; stats.totalOpen += amount; }
      if (inv.status === "paid") { stats.paid++; stats.totalRevenue += amount; }
      if (inv.status === "overdue") { stats.overdue++; stats.totalOverdue += amount; }
    }

    const mapped: PlatformInvoice[] = (invoices ?? []).map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      status: inv.status as InvoiceStatus,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      total_inc_vat: Number(inv.total_inc_vat) || 0,
      vat_amount: Number(inv.vat_amount) || 0,
      client_name: (inv.client as unknown as { name: string })?.name ?? "—",
      user_name: (inv.user as unknown as { full_name: string })?.full_name ?? "—",
      user_id: inv.user_id,
      payment_method: inv.payment_method,
      mollie_payment_id: inv.mollie_payment_id,
      is_credit_note: inv.is_credit_note ?? false,
    }));

    return { error: null, data: { invoices: mapped, total: count ?? 0, stats } };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getPlatformInvoices" }) };
  }
}

// ─── Platform Bank Connections ───

export interface PlatformBankConnection {
  id: string;
  user_id: string;
  user_name: string;
  institution_name: string;
  iban: string | null;
  status: string;
  last_synced_at: string | null;
  transaction_count: number;
  created_at: string;
}

export interface PlatformBankStats {
  totalConnections: number;
  activeConnections: number;
  expiredConnections: number;
  totalTransactions: number;
  totalIncome: number;
  totalExpenses: number;
}

export async function getPlatformBankConnections(): Promise<ActionResult<{ connections: PlatformBankConnection[]; stats: PlatformBankStats }>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();

    const [connectionsResult, transactionsResult] = await Promise.all([
      supabase
        .from("bank_connections")
        .select("id, user_id, institution_name, iban, status, last_synced_at, created_at, user:profiles!bank_connections_user_id_fkey(full_name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("bank_transactions")
        .select("bank_connection_id, amount, is_income"),
    ]);

    if (connectionsResult.error) return { error: sanitizeError(connectionsResult.error, { action: "getPlatformBankConnections" }) };

    // Aggregate transaction stats per connection
    const txMap = new Map<string, number>();
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const tx of transactionsResult.data ?? []) {
      txMap.set(tx.bank_connection_id, (txMap.get(tx.bank_connection_id) ?? 0) + 1);
      const amount = Number(tx.amount) || 0;
      if (tx.is_income) totalIncome += amount;
      else totalExpenses += Math.abs(amount);
    }

    const connections: PlatformBankConnection[] = (connectionsResult.data ?? []).map((c) => ({
      id: c.id,
      user_id: c.user_id,
      user_name: (c.user as unknown as { full_name: string })?.full_name ?? "—",
      institution_name: c.institution_name,
      iban: c.iban,
      status: c.status,
      last_synced_at: c.last_synced_at,
      transaction_count: txMap.get(c.id) ?? 0,
      created_at: c.created_at,
    }));

    const stats: PlatformBankStats = {
      totalConnections: connections.length,
      activeConnections: connections.filter((c) => c.status === "active").length,
      expiredConnections: connections.filter((c) => c.status === "expired" || c.status === "error").length,
      totalTransactions: transactionsResult.data?.length ?? 0,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
    };

    return { error: null, data: { connections, stats } };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getPlatformBankConnections" }) };
  }
}

// ─── Platform Expenses Overview ───

export interface PlatformExpenseStats {
  totalReceipts: number;
  totalExpenseAmount: number;
  categoryCounts: Array<{ category: string; count: number; total: number }>;
  topUsers: Array<{ user_id: string; user_name: string; receipt_count: number; total_amount: number }>;
}

export async function getPlatformExpenses(): Promise<ActionResult<PlatformExpenseStats>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();

    const [receiptsResult, profilesResult] = await Promise.all([
      supabase.from("receipts").select("id, user_id, amount_inc_vat, category"),
      supabase.from("profiles").select("id, full_name"),
    ]);

    if (receiptsResult.error) return { error: sanitizeError(receiptsResult.error, { action: "getPlatformExpenses" }) };

    const receipts = receiptsResult.data ?? [];
    const profileMap = new Map<string, string>();
    for (const p of profilesResult.data ?? []) {
      profileMap.set(p.id, p.full_name ?? "Naamloos");
    }

    let totalExpenseAmount = 0;
    const categoryMap = new Map<string, { count: number; total: number }>();
    const userMap = new Map<string, { count: number; total: number }>();

    for (const r of receipts) {
      const amount = Number(r.amount_inc_vat) || 0;
      totalExpenseAmount += amount;

      const cat = r.category || "Onbekend";
      const existing = categoryMap.get(cat) ?? { count: 0, total: 0 };
      existing.count++;
      existing.total += amount;
      categoryMap.set(cat, existing);

      const userExisting = userMap.get(r.user_id) ?? { count: 0, total: 0 };
      userExisting.count++;
      userExisting.total += amount;
      userMap.set(r.user_id, userExisting);
    }

    const categoryCounts = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const topUsers = Array.from(userMap.entries())
      .map(([user_id, data]) => ({
        user_id,
        user_name: profileMap.get(user_id) ?? "Naamloos",
        receipt_count: data.count,
        total_amount: Math.round(data.total * 100) / 100,
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 10);

    return {
      error: null,
      data: {
        totalReceipts: receipts.length,
        totalExpenseAmount: Math.round(totalExpenseAmount * 100) / 100,
        categoryCounts,
        topUsers,
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getPlatformExpenses" }) };
  }
}
