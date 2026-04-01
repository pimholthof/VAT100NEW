"use server";

import { requireAuth, requireAdmin } from "@/lib/supabase/server";
import type { ActionResult, SafeToSpendData } from "@/lib/types";
import { calculateZZPTaxProjection, calculateKIA } from "@/lib/tax/dutch-tax-2026";
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

export interface TaxAuditSummary {
  score: number;
  status: string;
  quarter: number;
  year: number;
  findingsCount: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentInvoices: RecentInvoice[];
  upcomingInvoices: UpcomingInvoice[];
  cashflow: CashflowSummary;
  vatDeadline: VatDeadline;
  safeToSpend: SafeToSpendData;
  latestTaxAudit?: TaxAuditSummary;
}

interface RpcCashflowEntry {
  month: string;
  amount: number;
}

interface RpcRecentInvoice {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  total_inc_vat: number;
  client_name: string;
}

interface RpcUpcomingInvoice {
  id: string;
  invoice_number: string;
  status: string;
  due_date: string;
  total_inc_vat: number;
  client_name: string;
  client_email: string | null;
  days_overdue: number;
}

export async function getDashboardData(): Promise<ActionResult<DashboardData>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const now = new Date();

  // Single RPC call replaces 12 individual queries
  const { data: rpc, error: rpcError } = await supabase.rpc("get_dashboard_stats", {
    p_user_id: user.id,
  });

  if (rpcError) {
    Sentry.captureMessage(`Dashboard RPC failed: ${rpcError.message}`, "error");
    return { error: rpcError.message };
  }

  if (!rpc) {
    return { error: "Geen dashboard data ontvangen." };
  }

  // ── Parse RPC result ──
  const recentInvoices: RecentInvoice[] = ((rpc.recentInvoices ?? []) as RpcRecentInvoice[]).map((r) => ({
    id: r.id,
    invoice_number: r.invoice_number,
    status: r.status,
    issue_date: r.issue_date,
    total_inc_vat: Number(r.total_inc_vat) || 0,
    client_name: r.client_name ?? "—",
  }));

  const upcomingInvoices: UpcomingInvoice[] = ((rpc.upcomingInvoices ?? []) as RpcUpcomingInvoice[]).map((r) => ({
    id: r.id,
    invoice_number: r.invoice_number,
    status: r.status,
    due_date: r.due_date,
    total_inc_vat: Number(r.total_inc_vat) || 0,
    client_name: r.client_name ?? "—",
    client_email: r.client_email ?? null,
    days_overdue: Number(r.days_overdue) || 0,
  }));

  // ── Cashflow ──
  const cashflowRevenue: RpcCashflowEntry[] = (rpc.cashflowRevenue ?? []) as RpcCashflowEntry[];
  const cashflowExpenses: RpcCashflowEntry[] = (rpc.cashflowExpenses ?? []) as RpcCashflowEntry[];

  const monthlyRevenue = cashflowRevenue.map((e) => ({
    month: e.month,
    amount: Math.round(Number(e.amount) * 100) / 100,
  }));
  const monthlyExpenses = cashflowExpenses.map((e) => ({
    month: e.month,
    amount: Math.round(Number(e.amount) * 100) / 100,
  }));

  const currentMonthRev = monthlyRevenue[monthlyRevenue.length - 1]?.amount ?? 0;
  const currentMonthExp = monthlyExpenses[monthlyExpenses.length - 1]?.amount ?? 0;
  const lastMonthRev = monthlyRevenue[monthlyRevenue.length - 2]?.amount ?? 0;
  const lastMonthExp = monthlyExpenses[monthlyExpenses.length - 2]?.amount ?? 0;
  const netThisMonth = Math.round((currentMonthRev - currentMonthExp) * 100) / 100;
  const netLastMonth = Math.round((lastMonthRev - lastMonthExp) * 100) / 100;
  const trend: CashflowSummary["trend"] =
    netThisMonth > netLastMonth ? "up" : netThisMonth < netLastMonth ? "down" : "stable";

  // ── VAT deadline ──
  const currentQ = Number(rpc.currentQuarter) || (Math.floor(now.getMonth() / 3) + 1);
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

  const outputVat = Number(rpc.outputVat) || 0;
  const inputVat = Number(rpc.inputVat) || 0;

  // ── Safe-to-Spend ──
  const bankBalance = Number(rpc.bankBalance) || 0;
  const yearRevenueRecords = (rpc.yearRevenueRecords ?? []) as Array<{
    total_inc_vat: number;
    vat_amount: number;
  }>;

  const safeToSpend = calculateSafeToSpend(
    bankBalance,
    yearRevenueRecords,
    outputVat,
    inputVat
  );


  return {
    error: null,
    data: {
      stats: {
        revenueThisMonth: Number(rpc.revenueThisMonth) || 0,
        openInvoiceCount: Number(rpc.openInvoiceCount) || 0,
        openInvoiceAmount: Number(rpc.openInvoiceAmount) || 0,
        vatToPay: Number(rpc.vatToPay) || 0,
        receiptsThisMonth: Number(rpc.receiptsThisMonth) || 0,
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
      safeToSpend,
    },
  };
}

// ── Safe-to-Spend Calculator ──
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
// ─── Controller & CEO Audit Actions ───

export async function getControllerAuditData(): Promise<ActionResult<TaxAuditSummary>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const now = new Date();
  const currentQ = (Math.floor(now.getMonth() / 3) + 1);

  const { data: audit, error } = await supabase
    .from("tax_audits")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { error: error.message };

  const summary: TaxAuditSummary = audit ? {
    score: audit.score,
    status: audit.status,
    quarter: audit.quarter,
    year: audit.year,
    findingsCount: (audit.findings?.missing_receipts?.length || 0) + 
                    (audit.findings?.unlinked_invoices?.length || 0) + 
                    (audit.findings?.hours_gap > 0 ? 1 : 0)
  } : {
    score: 100,
    status: "GEREED VOOR SCAN",
    quarter: currentQ,
    year: now.getFullYear(),
    findingsCount: 0
  };

  return { error: null, data: summary };
}

export async function getControllerAuditHistory(): Promise<ActionResult<any[]>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("tax_audits")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { error: null, data: data || [] };
}
