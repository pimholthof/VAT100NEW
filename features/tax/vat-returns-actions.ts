"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, VatReturn, VatReturnInput } from "@/lib/types";
import { uuidSchema } from "@/lib/validation";

/**
 * Get all VAT returns for the current user, ordered by year/quarter descending.
 */
export async function getVatReturns(year?: number): Promise<ActionResult<VatReturn[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  let query = supabase
    .from("vat_returns")
    .select("*")
    .eq("user_id", user.id)
    .order("year", { ascending: false })
    .order("quarter", { ascending: false });

  if (year) {
    query = query.eq("year", year);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { error: null, data: (data ?? []) as VatReturn[] };
}

/**
 * Get a single VAT return.
 */
export async function getVatReturn(id: string): Promise<ActionResult<VatReturn>> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("vat_returns")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return { error: error.message };
  if (!data) return { error: "BTW-aangifte niet gevonden." };
  return { error: null, data: data as VatReturn };
}

/**
 * Prepare a VAT return for a specific quarter by snapshotting the current data.
 * Creates the return in 'open' status if it doesn't exist yet.
 */
export async function prepareVatReturn(
  year: number,
  quarter: number,
): Promise<ActionResult<VatReturn>> {
  if (quarter < 1 || quarter > 4) return { error: "Ongeldig kwartaal." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Check if return already exists
  const { data: existing } = await supabase
    .from("vat_returns")
    .select("*")
    .eq("user_id", user.id)
    .eq("year", year)
    .eq("quarter", quarter)
    .single();

  if (existing) {
    return { error: null, data: existing as VatReturn };
  }

  // Calculate quarter boundaries
  const qStart = `${year}-${String((quarter - 1) * 3 + 1).padStart(2, "0")}-01`;
  const qEndMonth = quarter * 3;
  const qEnd = new Date(year, qEndMonth, 0).toISOString().split("T")[0];

  // Snapshot invoices and receipts for this quarter
  const [invoicesRes, receiptsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("subtotal_ex_vat, vat_amount, vat_scheme")
      .eq("user_id", user.id)
      .in("status", ["sent", "paid"])
      .gte("issue_date", qStart)
      .lte("issue_date", qEnd),
    supabase
      .from("receipts")
      .select("vat_amount, business_percentage")
      .eq("user_id", user.id)
      .gte("receipt_date", qStart)
      .lte("receipt_date", qEnd),
  ]);

  if (invoicesRes.error) return { error: invoicesRes.error.message };
  if (receiptsRes.error) return { error: receiptsRes.error.message };

  let revenueExVat = 0;
  let outputVat = 0;
  let euSupplies = 0;
  let exportOutsideEu = 0;

  for (const inv of invoicesRes.data ?? []) {
    const subtotal = Number(inv.subtotal_ex_vat) || 0;
    const vat = Number(inv.vat_amount) || 0;
    const scheme = inv.vat_scheme ?? "standard";

    if (scheme === "eu_reverse_charge") {
      euSupplies += subtotal;
    } else if (scheme === "export_outside_eu") {
      exportOutsideEu += subtotal;
    } else {
      revenueExVat += subtotal;
      outputVat += vat;
    }
  }

  let inputVat = 0;
  for (const rec of receiptsRes.data ?? []) {
    const pct = (rec.business_percentage ?? 100) / 100;
    inputVat += (Number(rec.vat_amount) || 0) * pct;
  }

  const round2 = (v: number) => Math.round(v * 100) / 100;
  const netVat = round2(outputVat - inputVat);

  const { data, error } = await supabase
    .from("vat_returns")
    .insert({
      user_id: user.id,
      year,
      quarter,
      status: "open",
      revenue_ex_vat: round2(revenueExVat),
      output_vat: round2(outputVat),
      input_vat: round2(inputVat),
      net_vat: netVat,
      eu_supplies: round2(euSupplies),
      eu_acquisitions: 0,
      export_outside_eu: round2(exportOutsideEu),
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data: data as VatReturn };
}

/**
 * File (lock) a VAT return. After filing, the quarter is immutable.
 */
export async function fileVatReturn(
  id: string,
  input: { reference?: string; notes?: string },
): Promise<ActionResult<VatReturn>> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Check current status
  const { data: current } = await supabase
    .from("vat_returns")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!current) return { error: "BTW-aangifte niet gevonden." };
  if (current.status !== "open") {
    return { error: "Deze aangifte is al ingediend." };
  }

  const { data, error } = await supabase
    .from("vat_returns")
    .update({
      status: "filed",
      filed_at: new Date().toISOString(),
      reference: input.reference?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data: data as VatReturn };
}

/**
 * Mark a filed return as accepted by the Belastingdienst.
 */
export async function acceptVatReturn(id: string): Promise<ActionResult<VatReturn>> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data: current } = await supabase
    .from("vat_returns")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!current) return { error: "BTW-aangifte niet gevonden." };
  if (current.status !== "filed") {
    return { error: "Alleen ingediende aangiftes kunnen als geaccepteerd worden gemarkeerd." };
  }

  const { data, error } = await supabase
    .from("vat_returns")
    .update({ status: "accepted" })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data: data as VatReturn };
}
