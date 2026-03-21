"use server";

import { requireAuth } from "@/lib/supabase/server";
import type {
  ActionResult,
  VatReturn,
  VatReturnStatus,
  TaxReservation,
  TaxReservationWithInvoice,
} from "@/lib/types";
import { vatReturnSchema, validate } from "@/lib/validation";
import { estimateIncomeTax } from "@/lib/tax";

export interface QuarterStats {
  quarter: string;
  revenueExVat: number;
  outputVat: number;
  inputVat: number;
  netVat: number;
  invoiceCount: number;
  receiptCount: number;
}

function getQuarterKey(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return "Q0 0000";
  }
  const month = d.getMonth(); // 0-based
  const year = d.getFullYear();
  const q = Math.floor(month / 3) + 1;
  return `Q${q} ${year}`;
}

export async function getBtwOverview(): Promise<ActionResult<QuarterStats[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Limit to last 2 years (8 quarters max)
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const startDate = `${twoYearsAgo.getFullYear()}-01-01`;

  // Run both queries in parallel
  const [invoicesResult, receiptsResult] = await Promise.all([
    supabase
      .from("invoices")
      .select("issue_date, subtotal_ex_vat, vat_amount, status")
      .eq("user_id", user.id)
      .in("status", ["sent", "paid"])
      .gte("issue_date", startDate),
    supabase
      .from("receipts")
      .select("receipt_date, vat_amount")
      .eq("user_id", user.id)
      .gte("receipt_date", startDate),
  ]);

  if (invoicesResult.error) return { error: invoicesResult.error.message };
  if (receiptsResult.error) return { error: receiptsResult.error.message };

  const invoices = invoicesResult.data;
  const receipts = receiptsResult.data;

  const quarters = new Map<string, QuarterStats>();

  const getOrCreate = (key: string): QuarterStats => {
    let q = quarters.get(key);
    if (!q) {
      q = {
        quarter: key,
        revenueExVat: 0,
        outputVat: 0,
        inputVat: 0,
        netVat: 0,
        invoiceCount: 0,
        receiptCount: 0,
      };
      quarters.set(key, q);
    }
    return q;
  };

  for (const inv of invoices ?? []) {
    if (!inv.issue_date) continue;
    const key = getQuarterKey(inv.issue_date);
    const q = getOrCreate(key);
    q.revenueExVat += Number(inv.subtotal_ex_vat) || 0;
    q.outputVat += Number(inv.vat_amount) || 0;
    q.invoiceCount += 1;
  }

  for (const rec of receipts ?? []) {
    if (!rec.receipt_date) continue;
    const key = getQuarterKey(rec.receipt_date);
    const q = getOrCreate(key);
    q.inputVat += Number(rec.vat_amount) || 0;
    q.receiptCount += 1;
  }

  // Calculate netVat and round
  for (const q of quarters.values()) {
    q.revenueExVat = Math.round(q.revenueExVat * 100) / 100;
    q.outputVat = Math.round(q.outputVat * 100) / 100;
    q.inputVat = Math.round(q.inputVat * 100) / 100;
    q.netVat = Math.round((q.outputVat - q.inputVat) * 100) / 100;
  }

  // Sort newest first (higher year first, then higher Q first), max 8
  const sorted = Array.from(quarters.values());
  sorted.sort((a, b) => {
    const ay = Number(a.quarter.split(" ")[1]);
    const by = Number(b.quarter.split(" ")[1]);
    if (ay !== by) return by - ay;
    const aq = Number(a.quarter.split(" ")[0].replace("Q", ""));
    const bq = Number(b.quarter.split(" ")[0].replace("Q", ""));
    return bq - aq;
  });

  return { error: null, data: sorted.slice(0, 8) };
}

// ═══════════════════════════════════════════════════════════════════
// BTW-aangifte (vat_returns) CRUD
// ═══════════════════════════════════════════════════════════════════

/**
 * Kwartaalperiode berekenen op basis van Q-string (bv. "Q1 2026")
 */
function getQuarterDates(quarterStr: string): { start: string; end: string } | null {
  const match = quarterStr.match(/^Q(\d)\s+(\d{4})$/);
  if (!match) return null;
  const q = Number(match[1]);
  const year = Number(match[2]);
  if (q < 1 || q > 4) return null;
  const startMonth = (q - 1) * 3; // 0-based
  const start = `${year}-${String(startMonth + 1).padStart(2, "0")}-01`;
  const endDate = new Date(year, startMonth + 3, 0); // last day of quarter
  const end = `${year}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end };
}

/**
 * Maak of werk een BTW-aangifte bij voor een kwartaal.
 * Berekent automatisch output/input BTW uit facturen en bonnen.
 */
export async function createOrUpdateVatReturn(
  quarterStr: string
): Promise<ActionResult<VatReturn>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const dates = getQuarterDates(quarterStr);
  if (!dates) return { error: "Ongeldig kwartaal formaat" };

  // Check of er al een ingediende/betaalde aangifte bestaat
  const { data: existing } = await supabase
    .from("vat_returns")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("period_start", dates.start)
    .eq("period_end", dates.end)
    .maybeSingle();

  if (existing && existing.status !== "concept") {
    return { error: "Deze aangifte is al ingediend en kan niet meer gewijzigd worden" };
  }

  // Bereken BTW uit facturen en bonnen
  const [invoicesResult, receiptsResult] = await Promise.all([
    supabase
      .from("invoices")
      .select("vat_amount")
      .eq("user_id", user.id)
      .in("status", ["sent", "paid"])
      .gte("issue_date", dates.start)
      .lte("issue_date", dates.end),
    supabase
      .from("receipts")
      .select("vat_amount")
      .eq("user_id", user.id)
      .gte("receipt_date", dates.start)
      .lte("receipt_date", dates.end),
  ]);

  if (invoicesResult.error) return { error: invoicesResult.error.message };
  if (receiptsResult.error) return { error: receiptsResult.error.message };

  const outputVat = (invoicesResult.data ?? []).reduce(
    (sum, inv) => sum + (Number(inv.vat_amount) || 0), 0
  );
  const inputVat = (receiptsResult.data ?? []).reduce(
    (sum, rec) => sum + (Number(rec.vat_amount) || 0), 0
  );

  const vatData = {
    period_start: dates.start,
    period_end: dates.end,
    output_vat: Math.round(outputVat * 100) / 100,
    input_vat: Math.round(inputVat * 100) / 100,
  };

  const validation = validate(vatReturnSchema, vatData);
  if (validation.error) return { error: validation.error };

  const vatDue = Math.round((vatData.output_vat - vatData.input_vat) * 100) / 100;

  if (existing) {
    // Update bestaand concept
    const { data, error } = await supabase
      .from("vat_returns")
      .update({
        output_vat: vatData.output_vat,
        input_vat: vatData.input_vat,
        vat_due: vatDue,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) return { error: error.message };
    return { error: null, data };
  }

  // Nieuw concept aanmaken
  const { data, error } = await supabase
    .from("vat_returns")
    .insert({
      user_id: user.id,
      period_start: vatData.period_start,
      period_end: vatData.period_end,
      output_vat: vatData.output_vat,
      input_vat: vatData.input_vat,
      vat_due: vatDue,
      status: "concept",
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data };
}

/**
 * Dien een BTW-aangifte in (concept → ingediend). Vergrendelt de aangifte.
 */
export async function submitVatReturn(
  vatReturnId: string
): Promise<ActionResult<VatReturn>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data: existing } = await supabase
    .from("vat_returns")
    .select("*")
    .eq("id", vatReturnId)
    .eq("user_id", user.id)
    .single();

  if (!existing) return { error: "Aangifte niet gevonden" };
  if (existing.status !== "concept") {
    return { error: "Alleen conceptaangiftes kunnen ingediend worden" };
  }

  const { data, error } = await supabase
    .from("vat_returns")
    .update({
      status: "ingediend" as VatReturnStatus,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", vatReturnId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data };
}

/**
 * Markeer een ingediende aangifte als betaald.
 */
export async function markVatReturnPaid(
  vatReturnId: string
): Promise<ActionResult<VatReturn>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data: existing } = await supabase
    .from("vat_returns")
    .select("status")
    .eq("id", vatReturnId)
    .eq("user_id", user.id)
    .single();

  if (!existing) return { error: "Aangifte niet gevonden" };
  if (existing.status !== "ingediend") {
    return { error: "Alleen ingediende aangiftes kunnen als betaald gemarkeerd worden" };
  }

  const { data, error } = await supabase
    .from("vat_returns")
    .update({ status: "betaald" as VatReturnStatus })
    .eq("id", vatReturnId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data };
}

/**
 * Haal alle BTW-aangiftes op, gesorteerd op periode (nieuwste eerst).
 */
export async function getVatReturns(): Promise<ActionResult<VatReturn[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("vat_returns")
    .select("*")
    .eq("user_id", user.id)
    .order("period_start", { ascending: false })
    .limit(20);

  if (error) return { error: error.message };
  return { error: null, data: data ?? [] };
}

/**
 * Verwijder een concept-aangifte.
 */
export async function deleteVatReturn(
  vatReturnId: string
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data: existing } = await supabase
    .from("vat_returns")
    .select("status")
    .eq("id", vatReturnId)
    .eq("user_id", user.id)
    .single();

  if (!existing) return { error: "Aangifte niet gevonden" };
  if (existing.status !== "concept") {
    return { error: "Alleen conceptaangiftes kunnen verwijderd worden" };
  }

  const { error } = await supabase
    .from("vat_returns")
    .delete()
    .eq("id", vatReturnId);

  if (error) return { error: error.message };
  return { error: null };
}

// ═══════════════════════════════════════════════════════════════════
// Tax Reservations (per factuur)
// ═══════════════════════════════════════════════════════════════════

/**
 * Maak een belastingreservering aan wanneer een factuur betaald wordt.
 * Berekent pro-rata IB- en BTW-reservering.
 */
export async function createTaxReservation(
  invoiceId: string
): Promise<ActionResult<TaxReservation>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Check of er al een reservering voor deze factuur is
  const { data: existingRes } = await supabase
    .from("tax_reservations")
    .select("id")
    .eq("user_id", user.id)
    .eq("invoice_id", invoiceId)
    .maybeSingle();

  if (existingRes) return { error: "Er bestaat al een reservering voor deze factuur" };

  // Haal de factuur op
  const { data: invoice, error: invError } = await supabase
    .from("invoices")
    .select("subtotal_ex_vat, vat_amount, issue_date")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (invError || !invoice) return { error: "Factuur niet gevonden" };

  const invoiceNetto = Number(invoice.subtotal_ex_vat) || 0;
  const invoiceVat = Number(invoice.vat_amount) || 0;

  // Haal jaaromzet en kosten op voor IB-berekening
  const year = new Date(invoice.issue_date).getFullYear();
  const [yearRevResult, yearCostResult, profileResult] = await Promise.all([
    supabase
      .from("invoices")
      .select("subtotal_ex_vat")
      .eq("user_id", user.id)
      .eq("status", "paid")
      .gte("issue_date", `${year}-01-01`)
      .lte("issue_date", `${year}-12-31`),
    supabase
      .from("receipts")
      .select("amount_ex_vat")
      .eq("user_id", user.id)
      .gte("receipt_date", `${year}-01-01`)
      .lte("receipt_date", `${year}-12-31`),
    supabase
      .from("profiles")
      .select("zelfstandigenaftrek")
      .eq("id", user.id)
      .single(),
  ]);

  const yearNetto = (yearRevResult.data ?? []).reduce(
    (sum, inv) => sum + (Number(inv.subtotal_ex_vat) || 0), 0
  );
  const yearCosts = (yearCostResult.data ?? []).reduce(
    (sum, rec) => sum + (Number(rec.amount_ex_vat) || 0), 0
  );
  const useZA = profileResult.data?.zelfstandigenaftrek ?? true;

  // Pro-rata IB-reservering: (factuur_netto / jaar_netto) × geschatte_IB
  const estimatedIB = estimateIncomeTax(yearNetto, yearCosts, useZA);
  const ratio = yearNetto > 0 ? invoiceNetto / yearNetto : 0;
  const ibReserved = Math.round(ratio * estimatedIB * 100) / 100;

  // BTW-reservering = de BTW op deze factuur
  const vatReserved = Math.round(invoiceVat * 100) / 100;

  // Periode bepalen
  const issueDate = new Date(invoice.issue_date);
  const q = Math.floor(issueDate.getMonth() / 3) + 1;
  const period = `Q${q} ${issueDate.getFullYear()}`;

  const { data, error } = await supabase
    .from("tax_reservations")
    .insert({
      user_id: user.id,
      invoice_id: invoiceId,
      period,
      vat_reserved: vatReserved,
      ib_reserved: ibReserved,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data };
}

/**
 * Haal alle belastingreserveringen op met factuurdetails.
 */
export async function getTaxReservations(): Promise<
  ActionResult<TaxReservationWithInvoice[]>
> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("tax_reservations")
    .select(`
      *,
      invoice:invoices(invoice_number, total_inc_vat, issue_date)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { error: error.message };

  const typed = (data ?? []).map((row) => ({
    ...row,
    invoice: row.invoice as TaxReservationWithInvoice["invoice"],
  }));

  return { error: null, data: typed };
}
