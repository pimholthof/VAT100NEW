"use server";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult, Receipt, ReceiptInput } from "@/lib/types";

export async function getReceipts(): Promise<ActionResult<Receipt[]>> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("user_id", user.id)
    .order("receipt_date", { ascending: false });

  if (error) return { error: error.message };
  return { error: null, data: data ?? [] };
}

export async function getReceipt(
  id: string
): Promise<ActionResult<Receipt>> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return { error: error.message };
  if (!data) return { error: "Bon niet gevonden." };
  return { error: null, data };
}

export async function createReceipt(
  input: ReceiptInput
): Promise<ActionResult<Receipt>> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const amountExVat = input.amount_ex_vat ?? 0;
  const vatRate = input.vat_rate ?? 21;
  const vatAmount = Math.round(amountExVat * (vatRate / 100) * 100) / 100;
  const amountIncVat = Math.round((amountExVat + vatAmount) * 100) / 100;

  const { data, error } = await supabase
    .from("receipts")
    .insert({
      user_id: user.id,
      vendor_name: input.vendor_name?.trim() || null,
      amount_ex_vat: amountExVat,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      amount_inc_vat: amountIncVat,
      category: input.category || "Overig",
      receipt_date: input.receipt_date || null,
      ai_processed: false,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data };
}

export async function updateReceipt(
  id: string,
  input: ReceiptInput
): Promise<ActionResult<Receipt>> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const amountExVat = input.amount_ex_vat ?? 0;
  const vatRate = input.vat_rate ?? 21;
  const vatAmount = Math.round(amountExVat * (vatRate / 100) * 100) / 100;
  const amountIncVat = Math.round((amountExVat + vatAmount) * 100) / 100;

  const { data, error } = await supabase
    .from("receipts")
    .update({
      vendor_name: input.vendor_name?.trim() || null,
      amount_ex_vat: amountExVat,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      amount_inc_vat: amountIncVat,
      category: input.category || "Overig",
      receipt_date: input.receipt_date || null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data };
}

export async function deleteReceipt(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const { error } = await supabase
    .from("receipts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}
