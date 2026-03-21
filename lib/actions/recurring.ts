"use server";

import { requireAuth } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";

type RecurringInterval = "maandelijks" | "kwartaal" | "jaarlijks";

/**
 * Markeer een factuur als terugkerend sjabloon.
 */
export async function setRecurring(
  invoiceId: string,
  interval: RecurringInterval,
  nextDate: string
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  if (!["maandelijks", "kwartaal", "jaarlijks"].includes(interval)) {
    return { error: "Ongeldig interval" };
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      is_template: true,
      recurring_interval: interval,
      recurring_next_date: nextDate,
    })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Stop een terugkerende factuur.
 */
export async function stopRecurring(
  invoiceId: string
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("invoices")
    .update({
      is_template: false,
      recurring_interval: null,
      recurring_next_date: null,
    })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Bereken de volgende datum op basis van het interval.
 */
function calculateNextDate(current: string, interval: RecurringInterval): string {
  const d = new Date(current);
  switch (interval) {
    case "maandelijks":
      d.setMonth(d.getMonth() + 1);
      break;
    case "kwartaal":
      d.setMonth(d.getMonth() + 3);
      break;
    case "jaarlijks":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().split("T")[0];
}

/**
 * Verwerk terugkerende facturen. Wordt aangeroepen door de cron-job.
 * Maakt conceptfacturen aan voor sjablonen waarvan de volgende datum bereikt is.
 */
export async function processRecurringInvoices(): Promise<
  ActionResult<{ created: number }>
> {
  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  // Vind alle sjablonen die vandaag of eerder gegenereerd moeten worden
  const { data: templates, error: fetchError } = await supabase
    .from("invoices")
    .select(`
      id, user_id, client_id, vat_rate, notes,
      recurring_interval, recurring_next_date
    `)
    .eq("is_template", true)
    .not("recurring_interval", "is", null)
    .not("recurring_next_date", "is", null)
    .lte("recurring_next_date", today);

  if (fetchError) return { error: fetchError.message };
  if (!templates || templates.length === 0) {
    return { error: null, data: { created: 0 } };
  }

  let created = 0;

  for (const template of templates) {
    // Haal de regels op van het sjabloon
    const { data: lines } = await supabase
      .from("invoice_lines")
      .select("description, quantity, unit, rate, amount, sort_order")
      .eq("invoice_id", template.id)
      .order("sort_order", { ascending: true });

    if (!lines || lines.length === 0) continue;

    // Genereer factuurnummer
    const { data: invoiceNumber } = await supabase.rpc(
      "generate_invoice_number",
      { p_user_id: template.user_id }
    );

    if (!invoiceNumber) continue;

    // Bereken totalen
    const subtotalExVat = lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    const vatRate = Number(template.vat_rate) || 21;
    const vatAmount = Math.round(subtotalExVat * (vatRate / 100) * 100) / 100;
    const totalIncVat = Math.round((subtotalExVat + vatAmount) * 100) / 100;

    // Maak de conceptfactuur aan
    const issueDate = template.recurring_next_date;
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const { data: newInvoice, error: insertError } = await supabase
      .from("invoices")
      .insert({
        user_id: template.user_id,
        client_id: template.client_id,
        invoice_number: invoiceNumber,
        status: "draft",
        issue_date: issueDate,
        due_date: dueDate.toISOString().split("T")[0],
        vat_rate: vatRate,
        notes: template.notes,
        subtotal_ex_vat: subtotalExVat,
        vat_amount: vatAmount,
        total_inc_vat: totalIncVat,
      })
      .select("id")
      .single();

    if (insertError || !newInvoice) continue;

    // Kopieer de regels
    const newLines = lines.map((line, index) => ({
      invoice_id: newInvoice.id,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
      amount: line.amount,
      sort_order: index,
    }));

    await supabase.from("invoice_lines").insert(newLines);

    // Werk de volgende datum bij op het sjabloon
    const nextDate = calculateNextDate(
      template.recurring_next_date,
      template.recurring_interval as RecurringInterval
    );

    await supabase
      .from("invoices")
      .update({ recurring_next_date: nextDate })
      .eq("id", template.id);

    created++;
  }

  return { error: null, data: { created } };
}
