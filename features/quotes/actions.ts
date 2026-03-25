"use server";

import { requireAuth } from "@/lib/supabase/server";
import type {
  ActionResult,
  Quote,
  QuoteInput,
  QuoteStatus,
  QuoteWithDetails,
} from "@/lib/types";
import { quoteSchema, uuidSchema, validate } from "@/lib/validation";
import { calculateLineTotals } from "@/lib/format";
import { createInvoice, generateInvoiceNumber } from "@/features/invoices/actions";

export type QuoteWithClient = Quote & {
  client: { name: string } | null;
};

export async function generateQuoteNumber(): Promise<ActionResult<string>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase.rpc("generate_quote_number", {
    p_user_id: user.id,
  });

  if (error) return { error: error.message };
  return { error: null, data: data as string };
}

export async function createQuote(
  input: QuoteInput
): Promise<ActionResult<string>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const v = validate(quoteSchema, input);
  if (v.error) return { error: v.error };

  const vat = calculateLineTotals(input.lines, input.vat_rate);
  const totals = {
    subtotal_ex_vat: vat.subtotalExVat,
    vat_amount: vat.vatAmount,
    total_inc_vat: vat.totalIncVat,
  };

  const MAX_RETRIES = 3;
  let quote: { id: string } | null = null;
  let quoteNumber = input.quote_number;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { data, error: insertError } = await supabase
      .from("quotes")
      .insert({
        user_id: user.id,
        client_id: input.client_id,
        quote_number: quoteNumber,
        status: input.status,
        issue_date: input.issue_date,
        valid_until: input.valid_until,
        vat_rate: input.vat_rate,
        notes: input.notes,
        ...totals,
      })
      .select("id")
      .single();

    if (!insertError) {
      quote = data;
      break;
    }

    const isUniqueViolation =
      insertError.code === "23505" ||
      insertError.message?.includes("idx_quotes_user_number");

    if (!isUniqueViolation || attempt === MAX_RETRIES - 1) {
      return { error: insertError.message };
    }

    const { data: newNumber, error: rpcError } = await supabase.rpc(
      "generate_quote_number",
      { p_user_id: user.id }
    );
    if (rpcError) return { error: rpcError.message };
    quoteNumber = newNumber as string;
  }

  if (!quote) return { error: "Offertenummer kon niet worden gegenereerd." };

  if (input.lines.length > 0) {
    const lineRows = input.lines.map((line, index) => ({
      quote_id: quote.id,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
      amount: Math.round(line.quantity * line.rate * 100) / 100,
      sort_order: index,
    }));

    const { error: linesError } = await supabase
      .from("quote_lines")
      .insert(lineRows);

    if (linesError) {
      await supabase.from("quotes").delete().eq("id", quote.id);
      return { error: linesError.message };
    }
  }

  return { error: null, data: quote.id };
}

export async function updateQuote(
  id: string,
  input: QuoteInput
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const v = validate(quoteSchema, input);
  if (v.error) return { error: v.error };

  const vat = calculateLineTotals(input.lines, input.vat_rate);
  const totals = {
    subtotal_ex_vat: vat.subtotalExVat,
    vat_amount: vat.vatAmount,
    total_inc_vat: vat.totalIncVat,
  };

  const { error: quoteError } = await supabase
    .from("quotes")
    .update({
      client_id: input.client_id,
      quote_number: input.quote_number,
      status: input.status,
      issue_date: input.issue_date,
      valid_until: input.valid_until,
      vat_rate: input.vat_rate,
      notes: input.notes,
      ...totals,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (quoteError) return { error: quoteError.message };

  const { error: deleteError } = await supabase
    .from("quote_lines")
    .delete()
    .eq("quote_id", id);

  if (deleteError) return { error: deleteError.message };

  if (input.lines.length > 0) {
    const lineRows = input.lines.map((line, index) => ({
      quote_id: id,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
      amount: Math.round(line.quantity * line.rate * 100) / 100,
      sort_order: index,
    }));

    const { error: linesError } = await supabase
      .from("quote_lines")
      .insert(lineRows);

    if (linesError) return { error: linesError.message };
  }

  return { error: null };
}

export async function updateQuoteStatus(
  id: string,
  status: QuoteStatus
): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig offerte-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("quotes")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteQuote(id: string): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig offerte-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data: quote } = await supabase
    .from("quotes")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!quote) return { error: "Offerte niet gevonden." };
  if (quote.status !== "draft") {
    return { error: "Alleen conceptoffertes kunnen worden verwijderd." };
  }

  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function getQuotes(filters?: {
  search?: string;
  status?: QuoteStatus;
}): Promise<ActionResult<QuoteWithClient[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  let query = supabase
    .from("quotes")
    .select("*, client:clients(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) return { error: error.message };

  let results = (data ?? []) as unknown as QuoteWithClient[];

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (quote) =>
        quote.quote_number.toLowerCase().includes(q) ||
        quote.client?.name?.toLowerCase().includes(q) ||
        String(quote.total_inc_vat).includes(q)
    );
  }

  return { error: null, data: results };
}

export async function getQuote(
  id: string
): Promise<ActionResult<QuoteWithDetails>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("quotes")
    .select("*, lines:quote_lines(*), client:clients(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .order("sort_order", { referencedTable: "quote_lines", ascending: true })
    .single();

  if (error) return { error: error.message };
  if (!data) return { error: "Offerte niet gevonden." };

  const { lines, client, ...quote } = data as unknown as QuoteWithDetails;
  return {
    error: null,
    data: { ...quote, lines: lines ?? [], client },
  };
}

export async function generateQuoteShareToken(
  quoteId: string
): Promise<ActionResult<string>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data: quote } = await supabase
    .from("quotes")
    .select("share_token")
    .eq("id", quoteId)
    .eq("user_id", user.id)
    .single();

  if (!quote) return { error: "Offerte niet gevonden." };

  if (quote.share_token) {
    return { error: null, data: quote.share_token };
  }

  const token = crypto.randomUUID().replace(/-/g, "");

  const { error } = await supabase
    .from("quotes")
    .update({ share_token: token })
    .eq("id", quoteId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null, data: token };
}

/**
 * Convert a quote to an invoice — copies all lines and marks quote as 'invoiced'.
 */
export async function convertQuoteToInvoice(
  quoteId: string
): Promise<ActionResult<string>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Fetch the quote with lines
  const quoteResult = await getQuote(quoteId);
  if (quoteResult.error || !quoteResult.data) {
    return { error: quoteResult.error ?? "Offerte niet gevonden." };
  }

  const quote = quoteResult.data;

  if (quote.status === "invoiced") {
    return { error: "Deze offerte is al omgezet naar een factuur." };
  }

  // Generate invoice number
  const numberResult = await generateInvoiceNumber();
  if (numberResult.error || !numberResult.data) {
    return { error: numberResult.error ?? "Kon geen factuurnummer genereren." };
  }

  // Create the invoice with the quote's data
  const invoiceResult = await createInvoice({
    client_id: quote.client_id,
    invoice_number: numberResult.data,
    status: "draft",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().split("T")[0];
    })(),
    vat_rate: quote.vat_rate as 0 | 9 | 21,
    notes: quote.notes,
    lines: quote.lines.map((l) => ({
      id: crypto.randomUUID(),
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      rate: l.rate,
    })),
  });

  if (invoiceResult.error || !invoiceResult.data) {
    return { error: invoiceResult.error ?? "Fout bij aanmaken factuur." };
  }

  // Mark quote as invoiced
  await supabase
    .from("quotes")
    .update({
      status: "invoiced",
      converted_invoice_id: invoiceResult.data,
    })
    .eq("id", quoteId)
    .eq("user_id", user.id);

  return { error: null, data: invoiceResult.data };
}

export async function duplicateQuote(
  sourceId: string
): Promise<ActionResult<string>> {
  const idCheck = uuidSchema.safeParse(sourceId);
  if (!idCheck.success) return { error: "Ongeldig offerte-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data: source, error: fetchError } = await supabase
    .from("quotes")
    .select("*, lines:quote_lines(*)")
    .eq("id", sourceId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !source) return { error: "Offerte niet gevonden." };

  const { data: newNumber, error: rpcError } = await supabase.rpc(
    "generate_quote_number",
    { p_user_id: user.id }
  );
  if (rpcError) return { error: rpcError.message };

  const today = new Date().toISOString().split("T")[0];
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const { data: newQuote, error: insertError } = await supabase
    .from("quotes")
    .insert({
      user_id: user.id,
      client_id: source.client_id,
      quote_number: newNumber as string,
      status: "draft",
      issue_date: today,
      valid_until: validUntil.toISOString().split("T")[0],
      vat_rate: source.vat_rate,
      notes: source.notes,
      subtotal_ex_vat: source.subtotal_ex_vat,
      vat_amount: source.vat_amount,
      total_inc_vat: source.total_inc_vat,
    })
    .select("id")
    .single();

  if (insertError || !newQuote) return { error: insertError?.message ?? "Kon offerte niet dupliceren." };

  const lines = (source.lines ?? []) as Array<{
    description: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
    sort_order: number;
  }>;

  if (lines.length > 0) {
    const lineRows = lines.map((line) => ({
      quote_id: newQuote.id,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
      amount: line.amount,
      sort_order: line.sort_order,
    }));

    const { error: linesError } = await supabase
      .from("quote_lines")
      .insert(lineRows);

    if (linesError) {
      await supabase.from("quotes").delete().eq("id", newQuote.id);
      return { error: linesError.message };
    }
  }

  return { error: null, data: newQuote.id };
}
