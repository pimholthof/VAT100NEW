"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, TaxPayment, TaxPaymentInput } from "@/lib/types";
import { taxPaymentSchema, uuidSchema, validate } from "@/lib/validation";

export async function getTaxPayments(
  year?: number,
): Promise<ActionResult<TaxPayment[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  let query = supabase
    .from("tax_payments")
    .select("*")
    .eq("user_id", user.id)
    .order("paid_date", { ascending: false });

  if (year) {
    query = query.like("period", `${year}%`);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { error: null, data: (data ?? []) as TaxPayment[] };
}

export async function createTaxPayment(
  input: TaxPaymentInput,
): Promise<ActionResult<TaxPayment>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const v = validate(taxPaymentSchema, input);
  if (v.error) return { error: v.error };

  const { data, error } = await supabase
    .from("tax_payments")
    .insert({
      user_id: user.id,
      type: input.type,
      period: input.period,
      amount: input.amount,
      paid_date: input.paid_date || null,
      reference: input.reference?.trim() || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data };
}

export async function updateTaxPayment(
  id: string,
  input: TaxPaymentInput,
): Promise<ActionResult<TaxPayment>> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const v = validate(taxPaymentSchema, input);
  if (v.error) return { error: v.error };

  const { data, error } = await supabase
    .from("tax_payments")
    .update({
      type: input.type,
      period: input.period,
      amount: input.amount,
      paid_date: input.paid_date || null,
      reference: input.reference?.trim() || null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data };
}

export async function deleteTaxPayment(id: string): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("tax_payments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export interface TaxPaymentsSummary {
  ibBetaald: number;
  btwBetaald: number;
  geschatteIB: number;
  geschatteBTW: number;
  verschilIB: number;
  verschilBTW: number;
  betalingen: TaxPayment[];
}

export async function getTaxPaymentsSummary(
  year: number,
): Promise<ActionResult<TaxPaymentsSummary>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Haal betalingen op voor dit jaar
  const { data: payments, error: paymentsError } = await supabase
    .from("tax_payments")
    .select("*")
    .eq("user_id", user.id)
    .like("period", `${year}%`)
    .order("paid_date", { ascending: true });

  if (paymentsError) return { error: paymentsError.message };

  const betalingen = (payments ?? []) as TaxPayment[];

  const ibBetaald = betalingen
    .filter((p) => p.type === "ib")
    .reduce((s, p) => s + Number(p.amount), 0);
  const btwBetaald = betalingen
    .filter((p) => p.type === "btw")
    .reduce((s, p) => s + Number(p.amount), 0);

  // Haal geschatte belasting op via bestaande queries
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const [invoicesRes, receiptsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("subtotal_ex_vat, vat_amount")
      .eq("user_id", user.id)
      .in("status", ["sent", "paid"])
      .gte("issue_date", yearStart)
      .lte("issue_date", yearEnd),
    supabase
      .from("receipts")
      .select("vat_amount, business_percentage")
      .eq("user_id", user.id)
      .gte("receipt_date", yearStart)
      .lte("receipt_date", yearEnd),
  ]);

  const outputVat = (invoicesRes.data ?? []).reduce(
    (s, i) => s + (Number(i.vat_amount) || 0),
    0,
  );
  const inputVat = (receiptsRes.data ?? []).reduce(
    (s, r) => s + (Number(r.vat_amount) || 0) * ((r.business_percentage ?? 100) / 100),
    0,
  );
  const geschatteBTW = Math.max(0, Math.round((outputVat - inputVat) * 100) / 100);

  // Eenvoudige IB-schatting: import de echte berekening
  const { calculateZZPTaxProjection } = await import("@/lib/tax/dutch-tax-2026");
  const jaarOmzet = (invoicesRes.data ?? []).reduce(
    (s, i) => s + (Number(i.subtotal_ex_vat) || 0),
    0,
  );

  const now = new Date();
  const maanden = year < now.getFullYear() ? 12 : now.getMonth() + 1;
  const projection = calculateZZPTaxProjection({
    jaarOmzetExBtw: jaarOmzet,
    jaarKostenExBtw: 0,
    investeringen: [],
    maandenVerstreken: maanden,
    huidigJaar: year,
  });

  const geschatteIB = Math.max(0, Math.round(projection.nettoIB * 100) / 100);

  return {
    error: null,
    data: {
      ibBetaald: Math.round(ibBetaald * 100) / 100,
      btwBetaald: Math.round(btwBetaald * 100) / 100,
      geschatteIB,
      geschatteBTW,
      verschilIB: Math.round((geschatteIB - ibBetaald) * 100) / 100,
      verschilBTW: Math.round((geschatteBTW - btwBetaald) * 100) / 100,
      betalingen,
    },
  };
}
