"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export interface RevenueByClient {
  clientName: string;
  totalExVat: number;
  invoiceCount: number;
}

export interface CostsByCategory {
  category: string;
  total: number;
  count: number;
}

export interface MonthlyProfit {
  month: string;
  revenue: number;
  costs: number;
  profit: number;
}

export interface ReportData {
  revenueByClient: RevenueByClient[];
  costsByCategory: CostsByCategory[];
  monthlyProfit: MonthlyProfit[];
  yearTotals: {
    revenue: number;
    costs: number;
    profit: number;
    invoiceCount: number;
    receiptCount: number;
  };
}

export async function getReportData(
  year?: number
): Promise<ActionResult<ReportData>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const targetYear = year ?? new Date().getFullYear();
  const startDate = `${targetYear}-01-01`;
  const endDate = `${targetYear}-12-31`;

  const [invoicesRes, receiptsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("subtotal_ex_vat, issue_date, status, client:clients(name)")
      .eq("user_id", user.id)
      .in("status", ["sent", "paid"])
      .gte("issue_date", startDate)
      .lte("issue_date", endDate),
    supabase
      .from("receipts")
      .select("amount_ex_vat, category, receipt_date")
      .eq("user_id", user.id)
      .gte("receipt_date", startDate)
      .lte("receipt_date", endDate),
  ]);

  if (invoicesRes.error) return { error: invoicesRes.error.message };
  if (receiptsRes.error) return { error: receiptsRes.error.message };

  interface InvoiceRow {
    subtotal_ex_vat: number;
    issue_date: string;
    status: string;
    client: { name: string } | null;
  }

  const invoices = (invoicesRes.data ?? []) as unknown as InvoiceRow[];
  const receipts = receiptsRes.data ?? [];

  // Revenue by client
  const clientMap = new Map<string, { total: number; count: number }>();
  for (const inv of invoices) {
    const name = inv.client?.name ?? "Onbekend";
    const existing = clientMap.get(name) ?? { total: 0, count: 0 };
    existing.total += Number(inv.subtotal_ex_vat) || 0;
    existing.count += 1;
    clientMap.set(name, existing);
  }
  const revenueByClient: RevenueByClient[] = Array.from(clientMap.entries())
    .map(([clientName, data]) => ({
      clientName,
      totalExVat: Math.round(data.total * 100) / 100,
      invoiceCount: data.count,
    }))
    .sort((a, b) => b.totalExVat - a.totalExVat);

  // Costs by category
  const categoryMap = new Map<string, { total: number; count: number }>();
  for (const rec of receipts) {
    const cat = (rec.category as string) ?? "Overig";
    const existing = categoryMap.get(cat) ?? { total: 0, count: 0 };
    existing.total += Number(rec.amount_ex_vat) || 0;
    existing.count += 1;
    categoryMap.set(cat, existing);
  }
  const costsByCategory: CostsByCategory[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      total: Math.round(data.total * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => b.total - a.total);

  // Monthly profit
  const monthlyRevenue = new Map<string, number>();
  const monthlyCosts = new Map<string, number>();

  for (let m = 0; m < 12; m++) {
    const key = `${targetYear}-${String(m + 1).padStart(2, "0")}`;
    monthlyRevenue.set(key, 0);
    monthlyCosts.set(key, 0);
  }

  for (const inv of invoices) {
    if (!inv.issue_date) continue;
    const d = new Date(inv.issue_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyRevenue.has(key)) {
      monthlyRevenue.set(key, (monthlyRevenue.get(key) ?? 0) + (Number(inv.subtotal_ex_vat) || 0));
    }
  }

  for (const rec of receipts) {
    const date = rec.receipt_date as string | null;
    if (!date) continue;
    const d = new Date(date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyCosts.has(key)) {
      monthlyCosts.set(key, (monthlyCosts.get(key) ?? 0) + (Number(rec.amount_ex_vat) || 0));
    }
  }

  const monthlyProfit: MonthlyProfit[] = Array.from(monthlyRevenue.keys()).map((month) => {
    const revenue = Math.round((monthlyRevenue.get(month) ?? 0) * 100) / 100;
    const costs = Math.round((monthlyCosts.get(month) ?? 0) * 100) / 100;
    return {
      month,
      revenue,
      costs,
      profit: Math.round((revenue - costs) * 100) / 100,
    };
  });

  const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.subtotal_ex_vat) || 0), 0);
  const totalCosts = receipts.reduce((sum, rec) => sum + (Number(rec.amount_ex_vat) || 0), 0);

  return {
    error: null,
    data: {
      revenueByClient,
      costsByCategory,
      monthlyProfit,
      yearTotals: {
        revenue: Math.round(totalRevenue * 100) / 100,
        costs: Math.round(totalCosts * 100) / 100,
        profit: Math.round((totalRevenue - totalCosts) * 100) / 100,
        invoiceCount: invoices.length,
        receiptCount: receipts.length,
      },
    },
  };
}
