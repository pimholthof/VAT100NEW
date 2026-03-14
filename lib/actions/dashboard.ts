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

  // Revenue this month: sum of paid invoices this month
  const { data: paidInvoices } = await supabase
    .from("invoices")
    .select("total_inc_vat")
    .eq("user_id", user.id)
    .eq("status", "paid")
    .gte("issue_date", monthStart)
    .lte("issue_date", monthEnd);

  const revenueThisMonth = (paidInvoices ?? []).reduce(
    (sum, inv) => sum + (inv.total_inc_vat ?? 0),
    0
  );

  // Open invoices (sent + overdue)
  const { data: openInvoices } = await supabase
    .from("invoices")
    .select("total_inc_vat")
    .eq("user_id", user.id)
    .in("status", ["sent", "overdue"]);

  const openInvoiceCount = openInvoices?.length ?? 0;
  const openInvoiceAmount = (openInvoices ?? []).reduce(
    (sum, inv) => sum + (inv.total_inc_vat ?? 0),
    0
  );

  // VAT to pay: sum of vat_amount on all invoices this month (sent + paid)
  const { data: vatInvoices } = await supabase
    .from("invoices")
    .select("vat_amount")
    .eq("user_id", user.id)
    .in("status", ["sent", "paid"])
    .gte("issue_date", monthStart)
    .lte("issue_date", monthEnd);

  const vatToPay = (vatInvoices ?? []).reduce(
    (sum, inv) => sum + (inv.vat_amount ?? 0),
    0
  );

  // Receipts processed this month
  const { count: receiptsThisMonth } = await supabase
    .from("receipts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("receipt_date", monthStart)
    .lte("receipt_date", monthEnd);

  return {
    error: null,
    data: {
      revenueThisMonth,
      openInvoiceCount,
      openInvoiceAmount,
      vatToPay,
      receiptsThisMonth: receiptsThisMonth ?? 0,
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

  const invoices: UpcomingInvoice[] = (data ?? []).map((row: Record<string, unknown>) => {
    const dueDate = new Date(row.due_date as string);
    dueDate.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - dueDate.getTime();
    const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const client = row.client as Record<string, unknown> | null;

    return {
      id: row.id as string,
      invoice_number: row.invoice_number as string,
      status: row.status as string,
      due_date: row.due_date as string,
      total_inc_vat: row.total_inc_vat as number,
      client_name: (client?.name as string) ?? "—",
      client_email: (client?.email as string) ?? null,
      days_overdue: daysOverdue,
    };
  });

  return { error: null, data: invoices };
}

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

  const invoices: RecentInvoice[] = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    invoice_number: row.invoice_number as string,
    status: row.status as string,
    issue_date: row.issue_date as string,
    total_inc_vat: row.total_inc_vat as number,
    client_name: (row.client as Record<string, unknown>)?.name as string ?? "—",
  }));

  return { error: null, data: invoices };
}
