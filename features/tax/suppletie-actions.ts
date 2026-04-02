"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, VatReturn, VatReturnCorrection } from "@/lib/types";
import { uuidSchema } from "@/lib/validation";

/**
 * Create a BTW suppletie (correction) for a submitted VAT return.
 */
export async function createSuppletie(
  originalReturnId: string,
  reden: string,
  correctedValues: {
    rubriek_1a_omzet: number;
    rubriek_1a_btw: number;
    rubriek_1b_omzet: number;
    rubriek_1b_btw: number;
    rubriek_1c_omzet: number;
    rubriek_1c_btw: number;
    rubriek_2a_omzet: number;
    rubriek_2a_btw: number;
    rubriek_3b_omzet: number;
    rubriek_3b_btw: number;
    rubriek_4a_omzet: number;
    rubriek_4a_btw: number;
    rubriek_4b_omzet: number;
    rubriek_4b_btw: number;
    rubriek_5b: number;
  }
): Promise<ActionResult<VatReturnCorrection>> {
  if (!uuidSchema.safeParse(originalReturnId).success) {
    return { error: "Ongeldige aangifte-ID." };
  }
  if (!reden.trim()) {
    return { error: "Reden voor suppletie is verplicht." };
  }

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Verify original return exists and is submitted
  const { data: original, error: fetchError } = await supabase
    .from("vat_returns")
    .select("*")
    .eq("id", originalReturnId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !original) {
    return { error: "Oorspronkelijke aangifte niet gevonden." };
  }

  if (original.status !== "submitted") {
    return { error: "Suppletie is alleen mogelijk op ingediende aangiftes." };
  }

  const { data, error } = await supabase
    .from("vat_return_corrections")
    .insert({
      user_id: user.id,
      original_return_id: originalReturnId,
      year: original.year,
      quarter: original.quarter,
      reden,
      ...correctedValues,
      status: "draft",
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data: data as VatReturnCorrection };
}

/**
 * Get all suppleties for a given user.
 */
export async function getSuppleties(): Promise<ActionResult<VatReturnCorrection[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("vat_return_corrections")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { error: null, data: (data ?? []) as VatReturnCorrection[] };
}

/**
 * Submit a suppletie (mark as definitief).
 */
export async function submitSuppletie(
  id: string
): Promise<ActionResult<VatReturnCorrection>> {
  if (!uuidSchema.safeParse(id).success) return { error: "Ongeldige suppletie-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("vat_return_corrections")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "draft")
    .select()
    .single();

  if (error) return { error: error.message };
  if (!data) return { error: "Suppletie niet gevonden of al ingediend." };
  return { error: null, data: data as VatReturnCorrection };
}
