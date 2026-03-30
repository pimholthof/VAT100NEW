"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, SafeToSpendData } from "@/lib/types";
import { calculateZZPTaxProjection, calculateKIA, type Investment } from "@/lib/tax/dutch-tax-2026";
import * as Sentry from "@sentry/nextjs";

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
  forecastedAmount: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentInvoices: RecentInvoice[];
  upcomingInvoices: UpcomingInvoice[];
  cashflow: CashflowSummary;
  vatDeadline: VatDeadline;
  safeToSpend: SafeToSpendData;
}

// Shape returned by the get_dashboard_stats RPC function
interface RpcDashboardStats {
  revenue_this_month: number;
  open_invoice_count: number;
  open_invoice_amount: number;
  vat_to_pay: number;
  receipts_this_month: number;
  recent_invoices: Array<{
    id: string;
    invoice_number: string;
    status: string;
    issue_date: string;
    total_inc_vat: number;
    client_name: string;
  }>;
  upcoming_invoices: Array<{
    id: string;
    invoice_number: string;
    status: string;
    due_date: string;
    total_inc_vat: number;
    client_name: string;
    client_email: string | null;
    days_overdue: number;
  }>;
  cashflow_invoices: Array<{ issue_date: string; total_inc_vat: number }>;
  cashflow_receipts: Array<{ receipt_date: string; total_amount: number }>;
  vat_quarter_output: number;
  vat_quarter_input: number;
  bank_balance: number;
  year_revenue: Array<{ total_inc_vat: number; vat_amount: number }>;
  current_quarter: number;
}

export async function getDashboardData(): Promise<ActionResult<DashboardData>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const now = new Date();

  // ── Single RPC call replaces 12 individual queries ──
  const { data: rpc, error: rpcError } = await supabase.rpc("get_dashboard_stats", {
    p_user_id: user.id,
  });

  if (rpcError) {
    Sentry.captureMessage(`Dashboard RPC failed: ${rpcError.message}`, "error");
    return { error: rpcError.message };
  }

  const stats = rpc as unknown as RpcDashboardStats;

  // ── Recent invoices ──
  const recentInvoices: RecentInvoice[] = (stats.recent_invoices ?? []).map((row) => ({
    id: row.id,
    invoice_number: row.invoice_number,
    status: row.status,
    issue_date: row.issue_date,
    total_inc_vat: row.total_inc_vat,
    client_name: row.client_name ?? "—",
  }));

  // ── Upcoming invoices ──
  const upcomingInvoices: UpcomingInvoice[] = (stats.upcoming_invoices ?? []).map((row) => ({
    id: row.id,
    invoice_number: row.invoice_number,
    status: row.status,
    due_date: row.due_date,
    total_inc_vat: row.total_inc_vat,
    client_name: row.client_name ?? "—",
    client_email: row.client_email ?? null,
    days_overdue: row.days_overdue ?? 0,
  }));

  // ── Cashflow ──
  const revenueMap = new Map<string, number>();
  const expenseMap = new Map<string, number>();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    revenueMap.set(key, 0);
    expenseMap.set(key, 0);
  }

  for (const inv of stats.cashflow_invoices ?? []) {
    if (!inv.issue_date) continue;
    const d = new Date(inv.issue_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (revenueMap.has(key)) {
      revenueMap.set(key, (revenueMap.get(key) ?? 0) + (Number(inv.total_inc_vat) || 0));
    }
  }

  for (const rec of stats.cashflow_receipts ?? []) {
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
  const currentQ = stats.current_quarter;
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

  const outputVat = Number(stats.vat_quarter_output) || 0;
  const inputVat = Number(stats.vat_quarter_input) || 0;

  return {
    error: null,
    data: {
      stats: {
        revenueThisMonth: Number(stats.revenue_this_month) || 0,
        openInvoiceCount: Number(stats.open_invoice_count) || 0,
        openInvoiceAmount: Number(stats.open_invoice_amount) || 0,
        vatToPay: Number(stats.vat_to_pay) || 0,
        receiptsThisMonth: Number(stats.receipts_this_month) || 0,
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
        forecastedAmount: Math.round(((outputVat - inputVat) * (90 / Math.max(1, 90 - daysRemaining))) * 100) / 100,
      },
      safeToSpend: calculateSafeToSpend(
        Number(stats.bank_balance) || 0,
        stats.year_revenue ?? [],
        outputVat,
        inputVat
      ),
    },
  };
}

// ── Safe-to-Spend Calculator ──
// Uses real 2026 tax calculation instead of simplified 37% estimate
function calculateSafeToSpend(
  currentBalance: number,
  yearRevenue: Array<{ total_inc_vat: number; vat_amount: number }>,
  outputVat: number,
  inputVat: number
): SafeToSpendData {
  const estimatedVat = Math.max(0, Math.round((outputVat - inputVat) * 100) / 100);

  const totalRevenueExVat = yearRevenue.reduce(
    (sum, inv) => sum + ((Number(inv.total_inc_vat) || 0) - (Number(inv.vat_amount) || 0)), 0
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
  const safeToSpend = Math.round((currentBalance - reservedTotal) * 100) / 100;

  const kiaVoordeel = totalRevenueExVat > 10000
    ? Math.round(calculateKIA(1000) * 0.3575 * 100) / 100
    : 0;

  return {
    currentBalance: Math.round(currentBalance * 100) / 100,
    estimatedVat,
    estimatedIncomeTax,
    reservedTotal: Math.round(reservedTotal * 100) / 100,
    safeToSpend: Math.max(0, safeToSpend),
    taxShieldPotential: kiaVoordeel,
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
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

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
