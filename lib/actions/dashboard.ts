"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult, SafeToSpendData } from "@/lib/types";

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

export interface CashflowSummary {
  monthlyRevenue: { month: string; amount: number }[];
  monthlyExpenses: { month: string; amount: number }[];
  netThisMonth: number;
  netLastMonth: number;
  trend: "up" | "down" | "stable";
}

export interface VatDeadline {
  quarter: string;
  deadline: string;
  daysRemaining: number;
  estimatedAmount: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentInvoices: RecentInvoice[];
  upcomingInvoices: UpcomingInvoice[];
  cashflow: CashflowSummary;
  vatDeadline: VatDeadline;
  safeToSpend: SafeToSpendData;
}

export async function getDashboardData(): Promise<ActionResult<DashboardData>> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) return { error: "Niet ingelogd." };

  const now = new Date();
  const userId = user.id;

  // Date ranges
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const cashflowStart = sixMonthsAgo.toISOString().split("T")[0];

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const upcomingCutoff = sevenDaysFromNow.toISOString().split("T")[0];

  const currentQ = Math.floor(now.getMonth() / 3) + 1;
  const qStart = new Date(now.getFullYear(), (currentQ - 1) * 3, 1)
    .toISOString()
    .split("T")[0];
  const qEnd = new Date(now.getFullYear(), currentQ * 3, 0)
    .toISOString()
    .split("T")[0];

  // Run ALL queries in a single Promise.all (single Supabase client, single auth check)
  const [
    { data: paidThisMonth },
    { data: openInvoices },
    { data: vatThisMonth },
    { count: receiptsCount },
    { data: recentData, error: recentError },
    { data: upcomingData, error: upcomingError },
    { data: cashflowInvoices },
    { data: cashflowReceipts },
    { data: vatQuarterInvoices },
    { data: vatQuarterReceipts },
    { data: bankBalanceData },
    { data: yearRevenueData },
  ] = await Promise.all([
    // Stats: paid invoices this month
    supabase
      .from("invoices")
      .select("total_inc_vat")
      .eq("user_id", userId)
      .eq("status", "paid")
      .gte("issue_date", monthStart)
      .lte("issue_date", monthEnd),
    // Stats: open invoices
    supabase
      .from("invoices")
      .select("total_inc_vat")
      .eq("user_id", userId)
      .in("status", ["sent", "overdue"]),
    // Stats: VAT this month
    supabase
      .from("invoices")
      .select("vat_amount")
      .eq("user_id", userId)
      .in("status", ["sent", "paid"])
      .gte("issue_date", monthStart)
      .lte("issue_date", monthEnd),
    // Stats: receipts count this month
    supabase
      .from("receipts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("receipt_date", monthStart)
      .lte("receipt_date", monthEnd),
    // Recent invoices
    supabase
      .from("invoices")
      .select("id, invoice_number, status, issue_date, total_inc_vat, client:clients(name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    // Upcoming due invoices
    supabase
      .from("invoices")
      .select("id, invoice_number, status, due_date, total_inc_vat, client:clients(name, email)")
      .eq("user_id", userId)
      .in("status", ["sent", "overdue"])
      .not("due_date", "is", null)
      .lte("due_date", upcomingCutoff)
      .order("due_date", { ascending: true })
      .limit(10),
    // Cashflow: paid invoices last 6 months
    supabase
      .from("invoices")
      .select("issue_date, total_inc_vat")
      .eq("user_id", userId)
      .eq("status", "paid")
      .gte("issue_date", cashflowStart),
    // Cashflow: receipts last 6 months
    supabase
      .from("receipts")
      .select("receipt_date, total_amount")
      .eq("user_id", userId)
      .gte("receipt_date", cashflowStart),
    // VAT deadline: quarter invoices
    supabase
      .from("invoices")
      .select("vat_amount")
      .eq("user_id", userId)
      .in("status", ["sent", "paid"])
      .gte("issue_date", qStart)
      .lte("issue_date", qEnd),
    // VAT deadline: quarter receipts
    supabase
      .from("receipts")
      .select("vat_amount")
      .eq("user_id", userId)
      .gte("receipt_date", qStart)
      .lte("receipt_date", qEnd),
    // Safe-to-Spend: all bank transaction amounts (to compute balance)
    supabase
      .from("bank_transactions")
      .select("amount")
      .eq("user_id", userId),
    // Safe-to-Spend: total revenue this year for income tax estimate
    supabase
      .from("invoices")
      .select("total_inc_vat, vat_amount")
      .eq("user_id", userId)
      .eq("status", "paid")
      .gte("issue_date", `${now.getFullYear()}-01-01`),
  ]);

  if (recentError) return { error: recentError.message };
  if (upcomingError) return { error: upcomingError.message };

  // ── Stats ──
  const revenueThisMonth = (paidThisMonth ?? []).reduce(
    (sum, inv) => sum + (inv.total_inc_vat ?? 0), 0
  );
  const openInvoiceCount = openInvoices?.length ?? 0;
  const openInvoiceAmount = (openInvoices ?? []).reduce(
    (sum, inv) => sum + (inv.total_inc_vat ?? 0), 0
  );
  const vatToPay = (vatThisMonth ?? []).reduce(
    (sum, inv) => sum + (inv.vat_amount ?? 0), 0
  );

  // ── Recent invoices ──
  const recentInvoices: RecentInvoice[] = (
    (recentData as unknown as RecentInvoiceRow[]) ?? []
  ).map((row) => ({
    id: row.id,
    invoice_number: row.invoice_number,
    status: row.status,
    issue_date: row.issue_date,
    total_inc_vat: row.total_inc_vat,
    client_name: row.client?.name ?? "—",
  }));

  // ── Upcoming invoices ──
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingInvoices: UpcomingInvoice[] = (
    (upcomingData as unknown as UpcomingInvoiceRow[]) ?? []
  ).map((row) => {
    const dueDate = new Date(row.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const daysOverdue = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
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

  // ── Cashflow ──
  const revenueMap = new Map<string, number>();
  const expenseMap = new Map<string, number>();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    revenueMap.set(key, 0);
    expenseMap.set(key, 0);
  }

  for (const inv of cashflowInvoices ?? []) {
    if (!inv.issue_date) continue;
    const d = new Date(inv.issue_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (revenueMap.has(key)) {
      revenueMap.set(key, (revenueMap.get(key) ?? 0) + (Number(inv.total_inc_vat) || 0));
    }
  }

  for (const rec of cashflowReceipts ?? []) {
    if (!rec.receipt_date) continue;
    const d = new Date(rec.receipt_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (expenseMap.has(key)) {
      expenseMap.set(key, (expenseMap.get(key) ?? 0) + (Number(rec.total_amount) || 0));
    }
  }

  const months = Array.from(revenueMap.keys());
  const monthlyRevenue = months.map((m) => ({
    month: m,
    amount: Math.round((revenueMap.get(m) ?? 0) * 100) / 100,
  }));
  const monthlyExpenses = months.map((m) => ({
    month: m,
    amount: Math.round((expenseMap.get(m) ?? 0) * 100) / 100,
  }));

  const currentMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2];
  const netThisMonth = Math.round(
    ((revenueMap.get(currentMonth) ?? 0) - (expenseMap.get(currentMonth) ?? 0)) * 100
  ) / 100;
  const netLastMonth = Math.round(
    ((revenueMap.get(lastMonth) ?? 0) - (expenseMap.get(lastMonth) ?? 0)) * 100
  ) / 100;
  const trend: CashflowSummary["trend"] =
    netThisMonth > netLastMonth ? "up" : netThisMonth < netLastMonth ? "down" : "stable";

  // ── VAT deadline ──
  const deadlines: Record<number, { month: number; day: number; yearOffset: number }> = {
    1: { month: 3, day: 30, yearOffset: 0 },
    2: { month: 6, day: 31, yearOffset: 0 },
    3: { month: 9, day: 31, yearOffset: 0 },
    4: { month: 0, day: 31, yearOffset: 1 },
  };
  const dl = deadlines[currentQ];
  const deadlineDate = new Date(now.getFullYear() + dl.yearOffset, dl.month, dl.day);
  const daysRemaining = Math.max(
    0,
    Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  const outputVat = (vatQuarterInvoices ?? []).reduce(
    (sum, inv) => sum + (Number(inv.vat_amount) || 0), 0
  );
  const inputVat = (vatQuarterReceipts ?? []).reduce(
    (sum, rec) => sum + (Number(rec.vat_amount) || 0), 0
  );

  return {
    error: null,
    data: {
      stats: {
        revenueThisMonth,
        openInvoiceCount,
        openInvoiceAmount,
        vatToPay,
        receiptsThisMonth: receiptsCount ?? 0,
      },
      recentInvoices,
      upcomingInvoices,
      cashflow: { monthlyRevenue, monthlyExpenses, netThisMonth, netLastMonth, trend },
      vatDeadline: {
        quarter: `Q${currentQ} ${now.getFullYear()}`,
        deadline: deadlineDate.toLocaleDateString("nl-NL", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        daysRemaining,
        estimatedAmount: Math.round((outputVat - inputVat) * 100) / 100,
      },
      safeToSpend: calculateSafeToSpend(
        bankBalanceData ?? [],
        yearRevenueData ?? [],
        outputVat,
        inputVat
      ),
    },
  };
}

// ── Safe-to-Spend Calculator (Agent 3: Tax Forecaster) ──
function calculateSafeToSpend(
  bankTransactions: Array<{ amount: number }>,
  yearRevenue: Array<{ total_inc_vat: number; vat_amount: number }>,
  outputVat: number,
  inputVat: number
): SafeToSpendData {
  // Current bank balance = sum of all transactions
  const currentBalance = bankTransactions.reduce(
    (sum, tx) => sum + (Number(tx.amount) || 0), 0
  );

  // Estimated VAT to pay this quarter
  const estimatedVat = Math.max(0, Math.round((outputVat - inputVat) * 100) / 100);

  // Estimated income tax: ~37% of net profit (revenue minus VAT = ex-VAT revenue)
  // This is a simplified Dutch IB estimate for ZZP'ers
  const totalRevenueExVat = yearRevenue.reduce(
    (sum, inv) => sum + ((Number(inv.total_inc_vat) || 0) - (Number(inv.vat_amount) || 0)), 0
  );
  const estimatedIncomeTax = Math.max(0, Math.round(totalRevenueExVat * 0.37 * 100) / 100);

  const reservedTotal = estimatedVat + estimatedIncomeTax;
  const safeToSpend = Math.round((currentBalance - reservedTotal) * 100) / 100;

  return {
    currentBalance: Math.round(currentBalance * 100) / 100,
    estimatedVat,
    estimatedIncomeTax,
    reservedTotal: Math.round(reservedTotal * 100) / 100,
    safeToSpend: Math.max(0, safeToSpend),
  };
}

// ── Setup Progress (Onboarding Checklist) ──

export interface SetupProgress {
  hasProfile: boolean;
  hasClient: boolean;
  hasInvoice: boolean;
  hasReceipt: boolean;
  hasBankConnection: boolean;
}

export async function getSetupProgress(): Promise<ActionResult<SetupProgress>> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) return { error: "Niet ingelogd." };

  const [profileRes, clientRes, invoiceRes, receiptRes, bankRes] = await Promise.all([
    supabase.from("profiles").select("studio_name").eq("id", user.id).single(),
    supabase.from("clients").select("id").eq("user_id", user.id).limit(1),
    supabase.from("invoices").select("id").eq("user_id", user.id).limit(1),
    supabase.from("receipts").select("id").eq("user_id", user.id).limit(1),
    supabase.from("bank_connections").select("id").eq("user_id", user.id).limit(1),
  ]);

  return {
    error: null,
    data: {
      hasProfile: !!(profileRes.data?.studio_name),
      hasClient: (clientRes.data?.length ?? 0) > 0,
      hasInvoice: (invoiceRes.data?.length ?? 0) > 0,
      hasReceipt: (receiptRes.data?.length ?? 0) > 0,
      hasBankConnection: (bankRes.data?.length ?? 0) > 0,
    },
  };
}
