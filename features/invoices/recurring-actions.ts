"use server";

import { requireAuth } from "@/lib/supabase/server";
import type {
  ActionResult,
  RecurringInvoiceInput,
  RecurringInvoiceWithDetails,
} from "@/lib/types";
import { recurringInvoiceSchema, uuidSchema, validate } from "@/lib/validation";

export async function listRecurringInvoices(): Promise<
  ActionResult<RecurringInvoiceWithDetails[]>
> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("recurring_invoices")
    .select("*, lines:recurring_invoice_lines(*), client:clients(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { error: null, data: (data ?? []) as RecurringInvoiceWithDetails[] };
}

export async function createRecurringInvoice(
  input: RecurringInvoiceInput
): Promise<ActionResult<string>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const v = validate(recurringInvoiceSchema, input);
  if (v.error) return { error: v.error };

  const { data: rec, error: insertError } = await supabase
    .from("recurring_invoices")
    .insert({
      user_id: user.id,
      client_id: input.client_id,
      frequency: input.frequency,
      next_run_date: input.next_run_date,
      vat_rate: input.vat_rate,
      notes: input.notes,
      is_active: input.is_active,
      auto_send: input.auto_send,
    })
    .select("id")
    .single();

  if (insertError || !rec) return { error: insertError?.message ?? "Fout bij aanmaken." };

  // Insert lines
  if (input.lines.length > 0) {
    const lineRows = input.lines.map((l, i) => ({
      recurring_invoice_id: rec.id,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      rate: l.rate,
      amount: Math.round(l.quantity * l.rate * 100) / 100,
      sort_order: i,
    }));

    const { error: linesError } = await supabase
      .from("recurring_invoice_lines")
      .insert(lineRows);

    if (linesError) {
      await supabase.from("recurring_invoices").delete().eq("id", rec.id);
      return { error: `Regels mislukt: ${linesError.message}` };
    }
  }

  return { error: null, data: rec.id };
}

export async function updateRecurringInvoice(
  id: string,
  input: RecurringInvoiceInput
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return { error: "Ongeldig ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const v = validate(recurringInvoiceSchema, input);
  if (v.error) return { error: v.error };

  const { error: updateError } = await supabase
    .from("recurring_invoices")
    .update({
      client_id: input.client_id,
      frequency: input.frequency,
      next_run_date: input.next_run_date,
      vat_rate: input.vat_rate,
      notes: input.notes,
      is_active: input.is_active,
      auto_send: input.auto_send,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) return { error: updateError.message };

  // Replace lines
  await supabase
    .from("recurring_invoice_lines")
    .delete()
    .eq("recurring_invoice_id", id);

  if (input.lines.length > 0) {
    const lineRows = input.lines.map((l, i) => ({
      recurring_invoice_id: id,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      rate: l.rate,
      amount: Math.round(l.quantity * l.rate * 100) / 100,
      sort_order: i,
    }));

    const { error: linesError } = await supabase
      .from("recurring_invoice_lines")
      .insert(lineRows);

    if (linesError) return { error: linesError.message };
  }

  return { error: null };
}

export async function deleteRecurringInvoice(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return { error: "Ongeldig ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("recurring_invoices")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function toggleRecurringInvoice(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return { error: "Ongeldig ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("recurring_invoices")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}
