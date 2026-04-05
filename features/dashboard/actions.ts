"use server";

import { requireAuth, requireAdmin } from "@/lib/supabase/server";
import type { ActionResult, SafeToSpendData } from "@/lib/types";
import { calculateZZPTaxProjection, calculateKIA } from "@/lib/tax/dutch-tax-2026";
import { calculateFinancialHealth, type FinancialHealth } from "@/lib/tax/financial-health";
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

export interface OpenInvoice {
  id: string;
  invoice_number: string;
  status: string;
  due_date: string | null;
  total_inc_vat: number;
  client_name: string;
  client_email: string | null;
}

export interface UpcomingInvoice {
  id: string;
  invoice_number: string;
  status: string;
  due_date: string | null;
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

export interface CashflowForecastWeek {
  weekStart: string;
  expectedIncome: number;
  expectedExpenses: number;
  runningBalance: number;
  events: string[];
}

export interface DashboardData {
  stats: DashboardStats;
  recentInvoices: RecentInvoice[];
  openInvoices: UpcomingInvoice[];
  upcomingInvoices: UpcomingInvoice[];
  cashflow: CashflowSummary;
  vatDeadline: VatDeadline;
  safeToSpend: SafeToSpendData;
  latestTaxAudit?: TaxAuditSummary;
  cashflowForecast: CashflowForecastWeek[];
  financialHealth: FinancialHealth;
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
  due_date: string | null;
  total_inc_vat: number;
  client_name: string;
  client_email: string | null;
  days_overdue: number;
}

interface FallbackOpenInvoiceRow {
  id: string;
  invoice_number: string;
  status: string;
  due_date: string | null;
  total_inc_vat: number;
  created_at: string;
  client: { name: string | null; email: string | null } | Array<{ name: string | null; email: string | null }> | null;
}

function mapRpcUpcomingInvoice(r: RpcUpcomingInvoice): UpcomingInvoice {
  return {
    id: r.id,
    invoice_number: r.invoice_number,
    status: r.status,
    due_date: r.due_date ?? null,
    total_inc_vat: Number(r.total_inc_vat) || 0,
    client_name: r.client_name ?? "—",
    client_email: r.client_email ?? null,
    days_overdue: Number(r.days_overdue) || 0,
  };
}

function mapFallbackOpenInvoice(r: FallbackOpenInvoiceRow, today: Date): UpcomingInvoice {
  const client = Array.isArray(r.client) ? r.client[0] ?? null : r.client;
  const dueDate = r.due_date ? new Date(r.due_date) : null;
  const daysOverdue = dueDate
    ? Math.max(0, Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    id: r.id,
    invoice_number: r.invoice_number,
    status: r.status,
    due_date: r.due_date ?? null,
    total_inc_vat: Number(r.total_inc_vat) || 0,
    client_name: client?.name ?? "—",
    client_email: client?.email ?? null,
    days_overdue: daysOverdue,
  };
}

function getNextVatFilingPeriod(now: Date) {
  const currentYear = now.getFullYear();
  const today = new Date(currentYear, now.getMonth(), now.getDate());
  const filingPeriods = [
    { quarter: 4, year: currentYear - 1, deadlineDate: new Date(currentYear, 0, 31) },
    { quarter: 1, year: currentYear, deadlineDate: new Date(currentYear, 3, 30) },
    { quarter: 2, year: currentYear, deadlineDate: new Date(currentYear, 6, 31) },
    { quarter: 3, year: currentYear, deadlineDate: new Date(currentYear, 9, 31) },
    { quarter: 4, year: currentYear, deadlineDate: new Date(currentYear + 1, 0, 31) },
  ];

  const nextPeriod = filingPeriods.find((period) => period.deadlineDate >= today) ?? filingPeriods[filingPeriods.length - 1];
  const daysRemaining = Math.max(
    0,
    Math.ceil((nextPeriod.deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );

  return {
    ...nextPeriod,
    daysRemaining,
  };
}

export async function getDashboardData(): Promise<ActionResult<DashboardData>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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

  let openInvoices: UpcomingInvoice[] = Array.isArray(rpc.openInvoices)
    ? (rpc.openInvoices as RpcUpcomingInvoice[]).map(mapRpcUpcomingInvoice)
    : [];

  if (!Array.isArray(rpc.openInvoices)) {
    const { data: fallbackOpenInvoices, error: fallbackOpenInvoicesError } = await supabase
      .from("invoices")
      .select("id, invoice_number, status, due_date, total_inc_vat, created_at, client:clients(name, email)")
      .eq("user_id", user.id)
      .in("status", ["sent", "overdue"])
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(25);

    if (fallbackOpenInvoicesError) {
      Sentry.captureMessage(`Dashboard openInvoices fallback failed: ${fallbackOpenInvoicesError.message}`, "warning");
    } else {
      openInvoices = ((fallbackOpenInvoices ?? []) as FallbackOpenInvoiceRow[]).map((r) => mapFallbackOpenInvoice(r, today));
    }
  }

  const upcomingInvoices: UpcomingInvoice[] = ((rpc.upcomingInvoices ?? []) as RpcUpcomingInvoice[]).map(mapRpcUpcomingInvoice);

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

  const nextVatFiling = getNextVatFilingPeriod(now);

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

  // ── Cashflow Forecast (13 weken) ──
  const cashflowForecast = calculateCashflowForecast(
    bankBalance,
    upcomingInvoices,
    Number(rpc.avgMonthlyExpenses) || 0,
    nextVatFiling
  );

  // ── Financial Health Score ──
  const overdueCount = upcomingInvoices.filter((i) => i.days_overdue > 0).length;
  const financialHealth = calculateFinancialHealth({
    averageDSO: Number(rpc.averageDSO) || 30,
    openInvoiceAmount: Number(rpc.openInvoiceAmount) || 0,
    yearRevenue: yearRevenueRecords.reduce(
      (sum, inv) => sum + (Number(inv.total_inc_vat) || 0),
      0
    ),
    safeToSpend,
    receiptsThisMonth: Number(rpc.receiptsThisMonth) || 0,
    daysSinceLastBankSync: rpc.daysSinceLastBankSync != null ? Number(rpc.daysSinceLastBankSync) : null,
    overdueCount,
  });

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
      openInvoices,
      upcomingInvoices,
      cashflow: { monthlyRevenue, monthlyExpenses, netThisMonth, netLastMonth, trend },
      vatDeadline: {
        quarter: `Q${nextVatFiling.quarter} ${nextVatFiling.year}`,
        deadline: nextVatFiling.deadlineDate.toISOString(),
        daysRemaining: nextVatFiling.daysRemaining,
        estimatedAmount: Math.round((outputVat - inputVat) * 100) / 100,
        forecastedAmount: Math.round(((outputVat - inputVat) * (90 / Math.max(1, 90 - nextVatFiling.daysRemaining))) * 100) / 100,
      },
      safeToSpend,
      cashflowForecast,
      financialHealth,
    },
  };
}

// ── Cashflow Forecast Calculator ──
function calculateCashflowForecast(
  currentBalance: number,
  upcomingInvoices: UpcomingInvoice[],
  avgMonthlyExpenses: number,
  vatFiling: { deadlineDate: Date; daysRemaining: number; quarter: number; year: number }
): CashflowForecastWeek[] {
  const weeks: CashflowForecastWeek[] = [];
  const weeklyExpenses = Math.round((avgMonthlyExpenses / 4.33) * 100) / 100;
  let balance = currentBalance;

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday

  for (let w = 0; w < 6; w++) {
    const weekStart = new Date(startOfWeek);
    weekStart.setDate(startOfWeek.getDate() + w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekStartStr = weekStart.toISOString().split("T")[0];
    const events: string[] = [];

    // Expected income: invoices with due_date in this week
    let expectedIncome = 0;
    for (const inv of upcomingInvoices) {
      if (!inv.due_date) continue;
      const dueDate = new Date(inv.due_date);
      if (dueDate >= weekStart && dueDate <= weekEnd) {
        expectedIncome += inv.total_inc_vat;
        if (inv.days_overdue > 0) {
          events.push(`Verlopen: ${inv.invoice_number} (${inv.client_name})`);
        } else {
          events.push(`Verwacht: ${inv.invoice_number} (${inv.client_name})`);
        }
      }
    }

    // BTW deadline event
    if (vatFiling.deadlineDate >= weekStart && vatFiling.deadlineDate <= weekEnd) {
      events.push(`BTW-aangifte Q${vatFiling.quarter} ${vatFiling.year}`);
    }

    balance = Math.round((balance + expectedIncome - weeklyExpenses) * 100) / 100;

    weeks.push({
      weekStart: weekStartStr,
      expectedIncome: Math.round(expectedIncome * 100) / 100,
      expectedExpenses: weeklyExpenses,
      runningBalance: balance,
      events,
    });
  }

  return weeks;
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

/**
 * Onzichtbare assistent: draai alle achtergrond-agents bij dashboard load.
 * Alle agents zijn non-fatal — fouten worden gelogd maar blokkeren niets.
 */
export async function runBackgroundAgents(): Promise<void> {
  const auth = await requireAuth();
  if (auth.error !== null) return;
  const { user } = auth;

  await Promise.allSettled([
    // BTW-aangifte automatisch voorbereiden
    import("@/features/tax/vat-returns-actions").then(
      (m) => m.autoPreparePreviousQuarterVatReturn()
    ),
    // BTW-deadline alert als deadline <14 dagen
    import("@/features/dashboard/action-feed").then(
      (m) => m.runBtwDeadlineAlert(user.id)
    ),
  ]);
}
