"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export interface DashboardStats {
  revenueThisMonth: number;
  openInvoiceCount: number;
  openInvoiceAmount: number;
  vatToPay: number;
  receiptsThisMonth: number;
}

export interface RecentInvoice {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  total_inc_vat: number;
  client_name: string;
}

interface RecentInvoiceRow {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  total_inc_vat: number;
  client: { name: string } | null;
}

interface UpcomingInvoiceRow {
  id: string;
  invoice_number: string;
  status: string;
  due_date: string;
  total_inc_vat: number;
  client: { name: string; email: string | null } | null;
}

export async function getDashboardStats(): Promise<ActionResult<DashboardStats>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  // Run all stats queries in parallel
  const [
    { data: paidInvoices },
    { data: openInvoices },
    { data: vatInvoices },
    { count: receiptsCount },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("total_inc_vat")
      .eq("user_id", user.id)
      .eq("status", "paid")
      .gte("issue_date", monthStart)
      .lte("issue_date", monthEnd),
    supabase
      .from("invoices")
      .select("total_inc_vat")
      .eq("user_id", user.id)
      .in("status", ["sent", "overdue"]),
    supabase
      .from("invoices")
      .select("vat_amount")
      .eq("user_id", user.id)
      .in("status", ["sent", "paid"])
      .gte("issue_date", monthStart)
      .lte("issue_date", monthEnd),
    supabase
      .from("receipts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("receipt_date", monthStart)
      .lte("receipt_date", monthEnd),
  ]);

  const revenueThisMonth = (paidInvoices ?? []).reduce(
    (sum, inv) => sum + (inv.total_inc_vat ?? 0),
    0
  );

  const openInvoiceCount = openInvoices?.length ?? 0;
  const openInvoiceAmount = (openInvoices ?? []).reduce(
    (sum, inv) => sum + (inv.total_inc_vat ?? 0),
    0
  );

  const vatToPay = (vatInvoices ?? []).reduce(
    (sum, inv) => sum + (inv.vat_amount ?? 0),
    0
  );

  const receiptsThisMonth = receiptsCount ?? 0;

  return {
    error: null,
    data: {
      revenueThisMonth,
      openInvoiceCount,
      openInvoiceAmount,
      vatToPay,
      receiptsThisMonth,
    },
  };
}

export interface UpcomingInvoice {
  id: string;
  invoice_number: string;
  status: string;
  due_date: string;
  total_inc_vat: number;
  client_name: string;
  client_email: string | null;
  days_overdue: number;
}

export async function getUpcomingDueInvoices(): Promise<ActionResult<UpcomingInvoice[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const cutoff = sevenDaysFromNow.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, due_date, total_inc_vat, client:clients(name, email)")
    .eq("user_id", user.id)
    .in("status", ["sent", "overdue"])
    .not("due_date", "is", null)
    .lte("due_date", cutoff)
    .order("due_date", { ascending: true })
    .limit(10);

  if (error) return { error: error.message };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const invoices: UpcomingInvoice[] = (data as unknown as UpcomingInvoiceRow[] ?? []).map((row) => {
    const dueDate = new Date(row.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - dueDate.getTime();
    const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return {
      id: row.id,
      invoice_number: row.invoice_number,
      status: row.status,
      due_date: row.due_date,
      total_inc_vat: row.total_inc_vat,
      client_name: row.client?.name ?? "—",
      client_email: row.client?.email ?? null,
      days_overdue: daysOverdue,
    };
  });

  return { error: null, data: invoices };
}

export interface CashflowSummary {
  monthlyRevenue: { month: string; amount: number }[];
  monthlyExpenses: { month: string; amount: number }[];
  netThisMonth: number;
  netLastMonth: number;
  trend: "up" | "down" | "stable";
}

export async function getCashflowSummary(): Promise<ActionResult<CashflowSummary>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const startDate = sixMonthsAgo.toISOString().split("T")[0];

  const { data: paidInvoices } = await supabase
    .from("invoices")
    .select("issue_date, total_inc_vat")
    .eq("user_id", user.id)
    .eq("status", "paid")
    .gte("issue_date", startDate);

  const { data: receipts } = await supabase
    .from("receipts")
    .select("receipt_date, total_amount")
    .eq("user_id", user.id)
    .gte("receipt_date", startDate);

  const revenueMap = new Map<string, number>();
  const expenseMap = new Map<string, number>();

  // Initialize all 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    revenueMap.set(key, 0);
    expenseMap.set(key, 0);
  }

  for (const inv of paidInvoices ?? []) {
    if (!inv.issue_date) continue;
    const d = new Date(inv.issue_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (revenueMap.has(key)) {
      revenueMap.set(key, (revenueMap.get(key) ?? 0) + (Number(inv.total_inc_vat) || 0));
    }
  }

  for (const rec of receipts ?? []) {
    if (!rec.receipt_date) continue;
    const d = new Date(rec.receipt_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (expenseMap.has(key)) {
      expenseMap.set(key, (expenseMap.get(key) ?? 0) + (Number(rec.total_amount) || 0));
    }
  }

  const months = Array.from(revenueMap.keys());
  const monthlyRevenue = months.map((m) => ({ month: m, amount: Math.round((revenueMap.get(m) ?? 0) * 100) / 100 }));
  const monthlyExpenses = months.map((m) => ({ month: m, amount: Math.round((expenseMap.get(m) ?? 0) * 100) / 100 }));

  const currentMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2];

  const netThisMonth = Math.round(((revenueMap.get(currentMonth) ?? 0) - (expenseMap.get(currentMonth) ?? 0)) * 100) / 100;
  const netLastMonth = Math.round(((revenueMap.get(lastMonth) ?? 0) - (expenseMap.get(lastMonth) ?? 0)) * 100) / 100;

  const trend: CashflowSummary["trend"] =
    netThisMonth > netLastMonth ? "up" : netThisMonth < netLastMonth ? "down" : "stable";

  return {
    error: null,
    data: { monthlyRevenue, monthlyExpenses, netThisMonth, netLastMonth, trend },
  };
}

export interface VatDeadline {
  quarter: string;
  deadline: string;
  daysRemaining: number;
  estimatedAmount: number;
}

export async function getVatDeadline(): Promise<ActionResult<VatDeadline>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const now = new Date();
  const currentMonth = now.getMonth(); // 0-based
  const currentYear = now.getFullYear();

  // Determine current quarter and its deadline
  // Q1 (jan-mar) → 30 april, Q2 (apr-jun) → 31 july, Q3 (jul-sep) → 31 oct, Q4 (oct-dec) → 31 jan next year
  const currentQ = Math.floor(currentMonth / 3) + 1;
  const deadlines: Record<number, { month: number; day: number; yearOffset: number }> = {
    1: { month: 3, day: 30, yearOffset: 0 },  // April 30
    2: { month: 6, day: 31, yearOffset: 0 },  // July 31
    3: { month: 9, day: 31, yearOffset: 0 },  // October 31
    4: { month: 0, day: 31, yearOffset: 1 },  // January 31 next year
  };

  const dl = deadlines[currentQ];
  const deadlineDate = new Date(currentYear + dl.yearOffset, dl.month, dl.day);
  const daysRemaining = Math.max(0, Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Quarter date range
  const qStart = new Date(currentYear, (currentQ - 1) * 3, 1);
  const qEnd = new Date(currentYear, currentQ * 3, 0);
  const qStartStr = qStart.toISOString().split("T")[0];
  const qEndStr = qEnd.toISOString().split("T")[0];

  const quarter = `Q${currentQ} ${currentYear}`;

  // Run output and input VAT queries in parallel
  const [{ data: invoices }, { data: receipts }] = await Promise.all([
    supabase
      .from("invoices")
      .select("vat_amount")
      .eq("user_id", user.id)
      .in("status", ["sent", "paid"])
      .gte("issue_date", qStartStr)
      .lte("issue_date", qEndStr),
    supabase
      .from("receipts")
      .select("vat_amount")
      .eq("user_id", user.id)
      .gte("receipt_date", qStartStr)
      .lte("receipt_date", qEndStr),
  ]);

  const outputVat = (invoices ?? []).reduce((sum, inv) => sum + (Number(inv.vat_amount) || 0), 0);
  const inputVat = (receipts ?? []).reduce((sum, rec) => sum + (Number(rec.vat_amount) || 0), 0);

  const estimatedAmount = Math.round((outputVat - inputVat) * 100) / 100;

  const deadlineStr = deadlineDate.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return {
    error: null,
    data: { quarter, deadline: deadlineStr, daysRemaining, estimatedAmount },
  };
}

export interface DashboardData {
  stats: DashboardStats;
  recentInvoices: RecentInvoice[];
  upcomingInvoices: UpcomingInvoice[];
  cashflow: CashflowSummary;
  vatDeadline: VatDeadline;
}

/** @deprecated Use getDashboardData instead */
export async function getRecentInvoices(): Promise<ActionResult<RecentInvoice[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, issue_date, total_inc_vat, client:clients(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) return { error: error.message };

  const invoices: RecentInvoice[] = (data as unknown as RecentInvoiceRow[] ?? []).map((row) => ({
    id: row.id,
    invoice_number: row.invoice_number,
    status: row.status,
    issue_date: row.issue_date,
    total_inc_vat: row.total_inc_vat,
    client_name: row.client?.name ?? "—",
  }));

  return { error: null, data: invoices };
}

export async function getDashboardData(): Promise<ActionResult<DashboardData>> {
  const [statsResult, recentResult, upcomingResult, cashflowResult, vatResult] =
    await Promise.all([
      getDashboardStats(),
      getRecentInvoices(),
      getUpcomingDueInvoices(),
      getCashflowSummary(),
      getVatDeadline(),
    ]);

  if (statsResult.error) return { error: statsResult.error };
  if (recentResult.error) return { error: recentResult.error };
  if (upcomingResult.error) return { error: upcomingResult.error };
  if (cashflowResult.error) return { error: cashflowResult.error };
  if (vatResult.error) return { error: vatResult.error };

  return {
    error: null,
    data: {
      stats: statsResult.data!,
      recentInvoices: recentResult.data!,
      upcomingInvoices: upcomingResult.data!,
      cashflow: cashflowResult.data!,
      vatDeadline: vatResult.data!,
    },
  };
}
