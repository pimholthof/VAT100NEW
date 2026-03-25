import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ReportClient from "./ReportClient";

export default async function ReportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const currentYear = new Date().getFullYear();

  // Fetch yearly data
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, lines:invoice_lines(*)")
    .eq("user_id", user.id)
    .gte("issue_date", `${currentYear}-01-01`)
    .lte("issue_date", `${currentYear}-12-31`)
    .order("issue_date", { ascending: false });

  const { data: quotes } = await supabase
    .from("quotes")
    .select("*")
    .eq("user_id", user.id)
    .gte("issue_date", `${currentYear}-01-01`)
    .lte("issue_date", `${currentYear}-12-31`)
    .order("issue_date", { ascending: false });

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_name, full_name")
    .eq("id", user.id)
    .single();

  const stats = calculateYearlyStats(invoices || [], quotes || []);

  return (
    <ReportClient
      year={currentYear}
      stats={stats}
      invoiceCount={invoices?.length || 0}
      quoteCount={quotes?.length || 0}
      studioName={profile?.studio_name || profile?.full_name || "Studio"}
    />
  );
}

type ReportInvoice = { is_credit_note?: boolean; total_inc_vat?: number; vat_amount?: number; status?: string };
type ReportQuote = { total_inc_vat?: number };

function calculateYearlyStats(invoices: ReportInvoice[], quotes: ReportQuote[]) {
  const totalRevenue = invoices
    .filter(inv => !inv.is_credit_note)
    .reduce((sum, inv) => sum + (inv.total_inc_vat || 0), 0);

  const totalCredit = invoices
    .filter(inv => inv.is_credit_note)
    .reduce((sum, inv) => sum + (inv.total_inc_vat || 0), 0);

  const netRevenue = totalRevenue - totalCredit;

  const totalVat = invoices.reduce((sum, inv) => sum + (inv.vat_amount || 0), 0);

  const paidInvoices = invoices.filter(inv => inv.status === "paid" && !inv.is_credit_note);
  const paidAmount = paidInvoices.reduce((sum, inv) => sum + (inv.total_inc_vat || 0), 0);

  const openInvoices = invoices.filter(inv => inv.status === "sent" && !inv.is_credit_note);
  const openAmount = openInvoices.reduce((sum, inv) => sum + (inv.total_inc_vat || 0), 0);

  const quoteTotal = quotes.reduce((sum, q) => sum + (q.total_inc_vat || 0), 0);

  return {
    totalRevenue,
    totalCredit,
    netRevenue,
    totalVat,
    paidAmount,
    openAmount,
    quoteTotal,
    conversionRate: quotes.length > 0 ? Math.round((invoices.length / quotes.length) * 100) : 0,
  };
}
