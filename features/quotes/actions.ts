"use server";

import { requireAuth } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils/errors";
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

async function queryNextQuoteNumber(
  supabase: NonNullable<Awaited<ReturnType<typeof requireAuth>>["supabase"]>,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from("quotes")
    .select("quote_number")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  let maxNum = 0;
  for (const row of data ?? []) {
    const digits = (row.quote_number as string).replace(/[^0-9]/g, "");
    if (digits) {
      const n = parseInt(digits, 10);
      if (n > maxNum) maxNum = n;
    }
  }
  return "OFF-" + String(maxNum + 1).padStart(4, "0");
}

export async function generateQuoteNumber(): Promise<ActionResult<string>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  try {
    const number = await queryNextQuoteNumber(supabase, user.id);
    return { error: null, data: number };
  } catch (e) {
    return { error: getErrorMessage(e) };
  }
}

export async function createQuote(
  input: QuoteInput
): Promise<ActionResult<string>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const v = validate(quoteSchema, input);
  if (v.error) return { error: v.error };

  const totals = calculateLineTotals(input.lines, input.vat_rate);

  const linesJson = input.lines.map((line) => ({
    description: line.description,
    quantity: line.quantity,
    unit: line.unit,
    rate: line.rate,
    amount: Math.round(line.quantity * line.rate * 100) / 100,
  }));

  const MAX_RETRIES = 3;
  let quoteNumber = input.quote_number;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { data, error: rpcError } = await supabase.rpc("create_quote_with_lines", {
      p_user_id: user.id,
      p_client_id: input.client_id,
      p_quote_number: quoteNumber,
      p_status: input.status,
      p_issue_date: input.issue_date,
      p_valid_until: input.valid_until,
      p_vat_rate: input.vat_rate,
      p_notes: input.notes ?? null,
      p_subtotal_ex_vat: totals.subtotalExVat,
      p_vat_amount: totals.vatAmount,
      p_total_inc_vat: totals.totalIncVat,
      p_lines: linesJson,
    });

    if (!rpcError) {
      return { error: null, data: data as string };
    }

    const isUniqueViolation =
      rpcError.code === "23505" ||
      rpcError.message?.includes("idx_quotes_user_number");

    if (!isUniqueViolation || attempt === MAX_RETRIES - 1) {
      return { error: rpcError.message };
    }

    quoteNumber = await queryNextQuoteNumber(supabase, user.id);
  }

  return { error: "Offertenummer kon niet worden gegenereerd." };
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

  const totals = calculateLineTotals(input.lines, input.vat_rate);

  const linesJson = input.lines.map((line) => ({
    description: line.description,
    quantity: line.quantity,
    unit: line.unit,
    rate: line.rate,
    amount: Math.round(line.quantity * line.rate * 100) / 100,
  }));

  const { error: rpcError } = await supabase.rpc("update_quote_with_lines", {
    p_user_id: user.id,
    p_quote_id: id,
    p_client_id: input.client_id,
    p_quote_number: input.quote_number,
    p_status: input.status,
    p_issue_date: input.issue_date,
    p_valid_until: input.valid_until,
    p_vat_rate: input.vat_rate,
    p_notes: input.notes ?? null,
    p_subtotal_ex_vat: totals.subtotalExVat,
    p_vat_amount: totals.vatAmount,
    p_total_inc_vat: totals.totalIncVat,
    p_lines: linesJson,
  });

  if (rpcError) return { error: rpcError.message };
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

  // Soft-delete: archiveer in plaats van verwijderen
  const { error } = await supabase
    .from("quotes")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("archived_at", null);

  if (error) return { error: error.message };
  return { error: null };
}

export async function restoreQuote(id: string): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig offerte-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("quotes")
    .update({ archived_at: null })
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
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.search) {
    const q = `%${filters.search}%`;
    query = query.or(`quote_number.ilike.${q},total_inc_vat::text.ilike.${q}`);
  }

  query = query.limit(200);

  const { data, error } = await query;

  if (error) return { error: error.message };

  return { error: null, data: (data ?? []) as unknown as QuoteWithClient[] };
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

  // Fetch client payment terms for smart due date
  const { data: clientData } = await supabase
    .from("clients")
    .select("payment_terms_days")
    .eq("id", quote.client_id)
    .eq("user_id", user.id)
    .single();

  const termDays = clientData?.payment_terms_days ?? 30;

  // Create the invoice with the quote's data
  const invoiceResult = await createInvoice({
    client_id: quote.client_id,
    invoice_number: numberResult.data,
    status: "draft",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: (() => {
      const d = new Date();
      d.setDate(d.getDate() + termDays);
      return d.toISOString().split("T")[0];
    })(),
    vat_rate: quote.vat_rate as 0 | 9 | 21,
    vat_scheme: ((quote as unknown as Record<string, unknown>).vat_scheme as import("@/lib/types").VatScheme) || "standard",
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

export async function sendQuoteEmail(
  quoteId: string
): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(quoteId);
  if (!idCheck.success) return { error: "Ongeldig offerte-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data: quote, error: fetchError } = await supabase
    .from("quotes")
    .select("*, client:clients(name, email), profile:profiles(full_name, studio_name)")
    .eq("id", quoteId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !quote) return { error: "Offerte niet gevonden." };

  const client = quote.client as { name: string; email: string | null } | null;
  if (!client?.email) return { error: "Klant heeft geen e-mailadres." };

  const profile = quote.profile as { full_name: string | null; studio_name: string | null } | null;
  const senderName = profile?.studio_name || profile?.full_name || "VAT100";

  let shareToken: string | null = quote.share_token ?? null;
  if (!shareToken) {
    const tokenResult = await generateQuoteShareToken(quoteId);
    shareToken = tokenResult.data ?? null;
  }

  const { sendQuoteEmail: sendEmail } = await import("@/lib/email/send-quote");
  const emailResult = await sendEmail({
    quoteNumber: quote.quote_number,
    quoteId,
    clientEmail: client.email,
    clientName: client.name,
    senderName,
    totalIncVat: quote.total_inc_vat,
    validUntil: quote.valid_until,
    notes: quote.notes ?? null,
    shareToken,
  });

  if (emailResult.error) return { error: emailResult.error };

  await supabase
    .from("quotes")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", quoteId)
    .eq("user_id", user.id);

  return { error: null };
}

export async function getClientPricingHistory(
  clientId: string
): Promise<ActionResult<Array<{ description: string; rate: number; unit: string }>>> {
  const idCheck = uuidSchema.safeParse(clientId);
  if (!idCheck.success) return { error: "Ongeldig klant-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [invoiceLinesRes, quoteLinesRes] = await Promise.all([
    supabase
      .from("invoice_lines")
      .select("description, rate, unit, invoices!inner(client_id, user_id, issue_date)")
      .eq("invoices.client_id", clientId)
      .eq("invoices.user_id", user.id)
      .gte("invoices.issue_date", sixMonthsAgo.toISOString().split("T")[0])
      .limit(50),
    supabase
      .from("quote_lines")
      .select("description, rate, unit, quotes!inner(client_id, user_id, issue_date)")
      .eq("quotes.client_id", clientId)
      .eq("quotes.user_id", user.id)
      .gte("quotes.issue_date", sixMonthsAgo.toISOString().split("T")[0])
      .limit(50),
  ]);

  const allLines = [
    ...(invoiceLinesRes.data ?? []),
    ...(quoteLinesRes.data ?? []),
  ];

  const seen = new Map<string, { description: string; rate: number; unit: string }>();
  for (const line of allLines) {
    const key = `${line.description?.toLowerCase()}:${line.rate}`;
    if (line.description && line.rate > 0 && !seen.has(key)) {
      seen.set(key, {
        description: line.description,
        rate: line.rate,
        unit: line.unit || "stuks",
      });
    }
  }

  return { error: null, data: Array.from(seen.values()).slice(0, 10) };
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

  const newNumber = await queryNextQuoteNumber(supabase, user.id);

  const today = new Date().toISOString().split("T")[0];
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const lines = (source.lines ?? []) as Array<{
    description: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
    sort_order: number;
  }>;

  const linesJson = lines.map((line) => ({
    description: line.description,
    quantity: line.quantity,
    unit: line.unit,
    rate: line.rate,
    amount: line.amount,
  }));

  const { data, error: rpcError } = await supabase.rpc("create_quote_with_lines", {
    p_user_id: user.id,
    p_client_id: source.client_id,
    p_quote_number: newNumber as string,
    p_status: "draft",
    p_issue_date: today,
    p_valid_until: validUntil.toISOString().split("T")[0],
    p_vat_rate: source.vat_rate,
    p_notes: source.notes ?? null,
    p_subtotal_ex_vat: source.subtotal_ex_vat,
    p_vat_amount: source.vat_amount,
    p_total_inc_vat: source.total_inc_vat,
    p_lines: linesJson,
  });

  if (rpcError) return { error: rpcError.message };
  return { error: null, data: data as string };
}
