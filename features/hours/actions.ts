"use server";

import { sanitizeSupabaseError } from "@/lib/errors";
import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, HoursLog, HoursLogInput } from "@/lib/types";
import { uuidSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";

export async function getHoursLog(filters?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<ActionResult<HoursLog[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  let query = supabase
    .from("hours_log")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (filters?.dateFrom) query = query.gte("date", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("date", filters.dateTo);

  const { data, error } = await query.limit(500);
  if (error) {
    return {
      error: sanitizeSupabaseError(error, {
        area: "getHoursLog",
        userId: user.id,
        filters,
      }),
    };
  }
  return { error: null, data: (data ?? []) as HoursLog[] };
}

export async function createHoursEntry(
  input: HoursLogInput,
): Promise<ActionResult<HoursLog>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  if (!input.hours || input.hours <= 0 || input.hours > 24) {
    return { error: "Uren moeten tussen 0 en 24 liggen." };
  }

  const insertData: Record<string, unknown> = {
    user_id: user.id,
    date: input.date,
    hours: input.hours,
    category: input.category?.trim() || null,
  };
  if ("quote_id" in input && input.quote_id) insertData.quote_id = input.quote_id;
  if ("project_name" in input && input.project_name) insertData.project_name = (input.project_name as string).trim();

  const { data, error } = await supabase
    .from("hours_log")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return {
      error: sanitizeSupabaseError(error, {
        area: "createHoursEntry",
        userId: user.id,
      }),
    };
  }
  return { error: null, data: data as HoursLog };
}

export async function updateHoursEntry(
  id: string,
  input: HoursLogInput,
): Promise<ActionResult<HoursLog>> {
  if (!uuidSchema.safeParse(id).success) return { error: "Ongeldig urenregistratie-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  if (!input.hours || input.hours <= 0 || input.hours > 24) {
    return { error: "Uren moeten tussen 0 en 24 liggen." };
  }

  const { data, error } = await supabase
    .from("hours_log")
    .update({
      date: input.date,
      hours: input.hours,
      category: input.category?.trim() || null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return {
      error: sanitizeSupabaseError(error, {
        area: "updateHoursEntry",
        entryId: id,
        userId: user.id,
      }),
    };
  }
  return { error: null, data: data as HoursLog };
}

export async function deleteHoursEntry(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return { error: "Ongeldig urenregistratie-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("hours_log")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      error: sanitizeSupabaseError(error, {
        area: "deleteHoursEntry",
        entryId: id,
        userId: user.id,
      }),
    };
  }
  return { error: null };
}

/**
 * Get year-to-date total hours (for urencriterium check: >= 1225 hours/year).
 */
export async function getYearTotalHours(
  year?: number,
): Promise<ActionResult<{ total: number; meetsUrencriterium: boolean }>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const targetYear = year ?? new Date().getFullYear();
  const yearStart = `${targetYear}-01-01`;
  const yearEnd = `${targetYear}-12-31`;

  const { data, error } = await supabase
    .from("hours_log")
    .select("hours")
    .eq("user_id", user.id)
    .gte("date", yearStart)
    .lte("date", yearEnd);

  if (error) {
    return {
      error: sanitizeSupabaseError(error, {
        area: "getYearTotalHours",
        targetYear,
        userId: user.id,
      }),
    };
  }

  const total = (data ?? []).reduce((sum, h) => sum + (Number(h.hours) || 0), 0);

  return {
    error: null,
    data: {
      total: Math.round(total * 100) / 100,
      meetsUrencriterium: total >= 1225,
    },
  };
}

// ─── Hours → Invoice Generation ───

export async function getHoursForQuote(
  quoteId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<ActionResult<{ lines: Array<{ quoteLineId: string | null; description: string; totalHours: number }>; grandTotal: number }>> {
  if (!uuidSchema.safeParse(quoteId).success) return { error: "Ongeldige offerte-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  let query = supabase
    .from("hours_log")
    .select("hours, quote_line_id, project_name, category")
    .eq("user_id", user.id)
    .eq("quote_id", quoteId);

  if (dateFrom) query = query.gte("date", dateFrom);
  if (dateTo) query = query.lte("date", dateTo);

  const { data, error } = await query;
  if (error) return { error: sanitizeSupabaseError(error, { area: "getHoursForQuote" }) };

  // Group by quote_line_id
  const groups = new Map<string, { totalHours: number; description: string }>();
  for (const row of data ?? []) {
    const key = row.quote_line_id || "__unlinked__";
    const existing = groups.get(key) || { totalHours: 0, description: row.project_name || row.category || "Uren" };
    existing.totalHours += Number(row.hours) || 0;
    groups.set(key, existing);
  }

  const lines = [...groups.entries()].map(([key, val]) => ({
    quoteLineId: key === "__unlinked__" ? null : key,
    description: val.description,
    totalHours: Math.round(val.totalHours * 100) / 100,
  }));

  const grandTotal = lines.reduce((sum, l) => sum + l.totalHours, 0);

  return { error: null, data: { lines, grandTotal: Math.round(grandTotal * 100) / 100 } };
}

export async function generateInvoiceFromHours(
  quoteId: string,
  dateFrom: string,
  dateTo: string
): Promise<ActionResult<{ invoiceId: string }>> {
  if (!uuidSchema.safeParse(quoteId).success) return { error: "Ongeldige offerte-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  try {
    // 1. Fetch quote with lines
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*, quote_lines(*), client:clients(name)")
      .eq("id", quoteId)
      .eq("user_id", user.id)
      .single();

    if (quoteError || !quote) return { error: "Offerte niet gevonden." };

    // 2. Fetch hours in date range
    const { data: hours, error: hoursError } = await supabase
      .from("hours_log")
      .select("*")
      .eq("user_id", user.id)
      .eq("quote_id", quoteId)
      .gte("date", dateFrom)
      .lte("date", dateTo);

    if (hoursError) return { error: "Kon uren niet ophalen." };
    if (!hours || hours.length === 0) return { error: "Geen uren gevonden in deze periode." };

    // 3. Group hours by quote_line_id and calculate totals
    const quoteLines = (quote.quote_lines || []) as Array<{
      id: string; description: string; rate: number; quantity: number; unit: string;
    }>;

    const lineGroups = new Map<string, { hours: number; description: string; rate: number }>();

    for (const h of hours) {
      const qlId = h.quote_line_id || "__default__";
      const existing = lineGroups.get(qlId) || { hours: 0, description: "", rate: 0 };
      existing.hours += Number(h.hours) || 0;

      if (!existing.description) {
        const matchedLine = quoteLines.find((ql) => ql.id === h.quote_line_id);
        if (matchedLine) {
          existing.description = matchedLine.description;
          existing.rate = Number(matchedLine.rate) || 0;
        } else {
          existing.description = h.project_name || h.category || "Werkzaamheden";
          existing.rate = quoteLines[0]?.rate ? Number(quoteLines[0].rate) : 0;
        }
      }
      lineGroups.set(qlId, existing);
    }

    // 4. Generate invoice number
    const { data: lastInvoice } = await supabase
      .from("invoices")
      .select("invoice_number")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const lastNum = lastInvoice?.invoice_number
      ? parseInt(lastInvoice.invoice_number.replace(/\D/g, ""), 10) || 0
      : 0;
    const invoiceNumber = `F-${String(lastNum + 1).padStart(4, "0")}`;

    // 5. Calculate totals
    const vatRate = quote.vat_rate ?? 21;
    let subtotal = 0;
    const invoiceLines: Array<{ description: string; quantity: number; unit: string; rate: number; amount: number; sort_order: number }> = [];

    let sortOrder = 0;
    for (const [, group] of lineGroups) {
      const roundedHours = Math.round(group.hours * 100) / 100;
      const lineAmount = Math.round(roundedHours * group.rate * 100) / 100;
      subtotal += lineAmount;
      sortOrder++;

      invoiceLines.push({
        description: `${group.description} \u2014 ${roundedHours} uur \u00D7 \u20AC${group.rate}`,
        quantity: roundedHours,
        unit: "uren",
        rate: group.rate,
        amount: lineAmount,
        sort_order: sortOrder,
      });
    }

    const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
    const totalIncVat = Math.round((subtotal + vatAmount) * 100) / 100;

    // 6. Create draft invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        user_id: user.id,
        client_id: quote.client_id,
        invoice_number: invoiceNumber,
        status: "draft",
        issue_date: new Date().toISOString().split("T")[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        vat_rate: vatRate,
        subtotal_ex_vat: subtotal,
        vat_amount: vatAmount,
        total_inc_vat: totalIncVat,
      })
      .select("id")
      .single();

    if (invoiceError || !invoice) return { error: "Kon factuur niet aanmaken." };

    // 7. Create invoice lines
    const lineRows = invoiceLines.map((line) => ({
      invoice_id: invoice.id,
      ...line,
    }));

    await supabase.from("invoice_lines").insert(lineRows);

    revalidatePath("/dashboard/invoices");
    return { error: null, data: { invoiceId: invoice.id } };
  } catch (e) {
    return { error: sanitizeSupabaseError(e as Error, { area: "generateInvoiceFromHours" }) };
  }
}

export async function linkHoursToQuote(
  hourIds: string[],
  quoteId: string,
  quoteLineId?: string
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const updates: Record<string, unknown> = { quote_id: quoteId };
  if (quoteLineId) updates.quote_line_id = quoteLineId;

  const { error } = await supabase
    .from("hours_log")
    .update(updates)
    .in("id", hourIds)
    .eq("user_id", user.id);

  if (error) return { error: sanitizeSupabaseError(error, { area: "linkHoursToQuote" }) };
  return { error: null };
}
