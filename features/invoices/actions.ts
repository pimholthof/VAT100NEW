"use server";

import { requireAuth } from "@/lib/supabase/server";
import { sendInvoiceEmail } from "@/lib/email/send-invoice";
import { sendReminderEmail } from "@/lib/email/send-reminder";
import { fetchInvoiceData } from "@/lib/invoice/fetch";
import type {
  ActionResult,
  Invoice,
  InvoiceInput,
  InvoiceStatus,
  InvoiceWithDetails,
} from "@/lib/types";
import { invoiceSchema, uuidSchema, validate } from "@/lib/validation";
import { calculateLineTotals } from "@/lib/format";
import { createServiceClient } from "@/lib/supabase/service";
import type { InvoiceData } from "@/lib/types";

export type InvoiceWithClient = Invoice & {
  client: { name: string } | null;
};

async function queryNextInvoiceNumber(
  supabase: NonNullable<Awaited<ReturnType<typeof requireAuth>>["supabase"]>,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  let maxNum = 0;
  for (const row of data ?? []) {
    const digits = (row.invoice_number as string).replace(/[^0-9]/g, "");
    if (digits) {
      const n = parseInt(digits, 10);
      if (n > maxNum) maxNum = n;
    }
  }
  return String(maxNum + 1).padStart(4, "0");
}

export async function generateInvoiceNumber(): Promise<ActionResult<string>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  try {
    const number = await queryNextInvoiceNumber(supabase, user.id);
    return { error: null, data: number };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Kon factuurnummer niet genereren." };
  }
}

export async function createInvoice(
  input: InvoiceInput
): Promise<ActionResult<string>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const v = validate(invoiceSchema, input);
  if (v.error) return { error: v.error };

  const vat = calculateLineTotals(input.lines, input.vat_rate);
  const totals = {
    subtotal_ex_vat: vat.subtotalExVat,
    vat_amount: vat.vatAmount,
    total_inc_vat: vat.totalIncVat,
  };

  // Retry loop: if a unique constraint violation occurs on invoice_number
  // (e.g. two tabs submitting simultaneously), regenerate the number and retry.
  const MAX_RETRIES = 3;
  let invoice: { id: string } | null = null;
  let invoiceNumber = input.invoice_number;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { data, error: insertError } = await supabase
      .from("invoices")
      .insert({
        user_id: user.id,
        client_id: input.client_id,
        invoice_number: invoiceNumber,
        status: input.status,
        issue_date: input.issue_date,
        due_date: input.due_date,
        vat_rate: input.vat_rate,
        notes: input.notes,
        ...totals,
      })
      .select("id")
      .single();

    if (!insertError) {
      invoice = data;
      break;
    }

    // Unique violation = PostgreSQL error code 23505
    const isUniqueViolation =
      insertError.code === "23505" ||
      insertError.message?.includes("idx_invoices_user_number");

    if (!isUniqueViolation || attempt === MAX_RETRIES - 1) {
      return { error: insertError.message };
    }

    invoiceNumber = await queryNextInvoiceNumber(supabase, user.id);
  }

  if (!invoice) return { error: "Factuurnummer kon niet worden gegenereerd." };

  if (input.lines.length > 0) {
    const lineRows = input.lines.map((line, index) => ({
      invoice_id: invoice.id,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
      amount: Math.round(line.quantity * line.rate * 100) / 100,
      sort_order: index,
    }));

    const { error: linesError } = await supabase
      .from("invoice_lines")
      .insert(lineRows);

    if (linesError) {
      // Rollback: delete the invoice if lines failed
      await supabase.from("invoices").delete().eq("id", invoice.id);
      return { error: linesError.message };
    }
  }

  return { error: null, data: invoice.id };
}

export async function updateInvoice(
  id: string,
  input: InvoiceInput
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const v = validate(invoiceSchema, input);
  if (v.error) return { error: v.error };

  const vat = calculateLineTotals(input.lines, input.vat_rate);
  const totals = {
    subtotal_ex_vat: vat.subtotalExVat,
    vat_amount: vat.vatAmount,
    total_inc_vat: vat.totalIncVat,
  };

  const { error: invoiceError } = await supabase
    .from("invoices")
    .update({
      client_id: input.client_id,
      invoice_number: input.invoice_number,
      status: input.status,
      issue_date: input.issue_date,
      due_date: input.due_date,
      vat_rate: input.vat_rate,
      notes: input.notes,
      ...totals,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (invoiceError) return { error: invoiceError.message };

  // Replace all lines: delete existing, insert new
  const { error: deleteError } = await supabase
    .from("invoice_lines")
    .delete()
    .eq("invoice_id", id);

  if (deleteError) return { error: deleteError.message };

  if (input.lines.length > 0) {
    const lineRows = input.lines.map((line, index) => ({
      invoice_id: id,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
      amount: Math.round(line.quantity * line.rate * 100) / 100,
      sort_order: index,
    }));

    const { error: linesError } = await supabase
      .from("invoice_lines")
      .insert(lineRows);

    if (linesError) return { error: linesError.message };
  }

  return { error: null };
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus
): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig factuur-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig factuur-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Only allow deleting drafts
  const { data: invoice } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!invoice) return { error: "Factuur niet gevonden." };
  if (invoice.status !== "draft") {
    return { error: "Alleen conceptfacturen kunnen worden verwijderd." };
  }

  // Lines cascade-delete via FK
  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function getInvoices(filters?: {
  search?: string;
  status?: InvoiceStatus;
  dateFrom?: string;
  dateTo?: string;
}): Promise<ActionResult<InvoiceWithClient[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  let query = supabase
    .from("invoices")
    .select("*, client:clients(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.dateFrom) {
    query = query.gte("issue_date", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("issue_date", filters.dateTo);
  }

  const { data, error } = await query;

  if (error) return { error: error.message };

  let results = (data ?? []) as unknown as InvoiceWithClient[];

  // Client-side search filtering (across invoice_number, client name, amount)
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (inv) =>
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.client?.name?.toLowerCase().includes(q) ||
        String(inv.total_inc_vat).includes(q)
    );
  }

  return { error: null, data: results };
}

export async function getInvoice(
  id: string
): Promise<ActionResult<InvoiceWithDetails>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("invoices")
    .select("*, lines:invoice_lines(*), client:clients(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .order("sort_order", { referencedTable: "invoice_lines", ascending: true })
    .single();

  if (error) return { error: error.message };
  if (!data) return { error: "Factuur niet gevonden." };

  const { lines, client, ...invoice } = data as unknown as InvoiceWithDetails;
  return {
    error: null,
    data: { ...invoice, lines: lines ?? [], client },
  };
}

export async function generateShareToken(
  invoiceId: string
): Promise<ActionResult<string>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Verify ownership
  const { data: invoice } = await supabase
    .from("invoices")
    .select("share_token")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (!invoice) return { error: "Factuur niet gevonden." };

  // Return existing token if already generated
  if (invoice.share_token) {
    return { error: null, data: invoice.share_token };
  }

  const token = crypto.randomUUID().replace(/-/g, "");

  // Token verloopt na 90 dagen
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  const { error } = await supabase
    .from("invoices")
    .update({
      share_token: token,
      share_token_expires_at: expiresAt.toISOString(),
    })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null, data: token };
}

export async function sendReminder(invoiceId: string, customMessage?: string): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(invoiceId);
  if (!idCheck.success) return { error: "Ongeldig factuur-ID." };
  if (customMessage && customMessage.length > 2000) {
    return { error: "Bericht mag maximaal 2000 tekens zijn." };
  }

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Verify ownership, status, and client email in one query
  const { data: invoice } = await supabase
    .from("invoices")
    .select("status, client:clients(email)")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (!invoice) return { error: "Factuur niet gevonden." };

  if (invoice.status !== "sent" && invoice.status !== "overdue") {
    return { error: "Herinneringen kunnen alleen worden verstuurd voor verzonden of verlopen facturen." };
  }

  const client = invoice.client as unknown as { email: string | null } | null;
  if (!client?.email) {
    return { error: "Klant heeft geen e-mailadres." };
  }

  const result = await fetchInvoiceData(invoiceId);
  if (result.error || !result.data) {
    return { error: result.error ?? "Kon factuurgegevens niet ophalen." };
  }
  return sendReminderEmail(result.data, customMessage);
}

export async function sendInvoice(id: string): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig factuur-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Verify ownership, status, and client email in one query
  const { data: invoice } = await supabase
    .from("invoices")
    .select("status, client:clients(email)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!invoice) return { error: "Factuur niet gevonden." };

  if (invoice.status === "draft") {
    return { error: "Conceptfacturen kunnen niet worden verzonden." };
  }

  const client = invoice.client as unknown as { email: string | null } | null;
  if (!client?.email) {
    return { error: "Klant heeft geen e-mailadres." };
  }

  return sendInvoiceEmail(id);
}

/**
 * Common logic for processing overdue invoices.
 * Can be called by Cron API or manually by user (if userId matches).
 */
export async function processOverdueInvoices(userId?: string): Promise<ActionResult<{ 
  updated: number; 
  results: Array<{
    invoiceNumber: string;
    emailSent: boolean;
    actionCreated: boolean;
    error?: string;
  }>; 
}>> {
  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  // 1. Find and mark overdue invoices
  let query = supabase
    .from("invoices")
    .update({ status: "overdue" })
    .eq("status", "sent")
    .lt("due_date", today);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data: overdueInvoices, error } = await query.select(
    "id, user_id, invoice_number, client_id, total_inc_vat, due_date, issue_date, subtotal_ex_vat, vat_amount"
  );

  if (error) return { error: error.message };

  const results: Array<{
    invoiceNumber: string;
    emailSent: boolean;
    actionCreated: boolean;
    error?: string;
  }> = [];

  for (const inv of overdueInvoices ?? []) {
    let emailSent = false;
    let actionCreated = false;
    let errorMsg: string | undefined;

    try {
      const [clientResult, profileResult, itemsResult] = await Promise.all([
        supabase.from("clients").select("*").eq("id", inv.client_id).single(),
        supabase.from("profiles").select("*").eq("id", inv.user_id).single(),
        supabase.from("invoice_lines").select("*").eq("invoice_id", inv.id),
      ]);

      if (clientResult.data && profileResult.data && clientResult.data.email) {
        const invoiceData: InvoiceData = {
          invoice: {
            ...inv,
            status: "overdue" as const,
          } as InvoiceData["invoice"],
          lines: (itemsResult.data ?? []) as InvoiceData["lines"],
          client: clientResult.data as InvoiceData["client"],
          profile: profileResult.data as InvoiceData["profile"],
        };

        const emailResult = await sendReminderEmail(invoiceData);
        emailSent = !emailResult.error;
        if (emailResult.error) errorMsg = emailResult.error;
      }

      await supabase.from("action_feed").insert({
        user_id: inv.user_id,
        type: "tax_alert",
        title: `Factuur ${inv.invoice_number} is verlopen`,
        description: `Factuur ${inv.invoice_number} (${new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(inv.total_inc_vat)}) is verlopen. ${emailSent ? "Een herinnering is automatisch verstuurd." : "Stuur handmatig een herinnering."}`,
        amount: inv.total_inc_vat,
        ai_confidence: 1.0,
      });
      actionCreated = true;
    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    results.push({
      invoiceNumber: inv.invoice_number,
      emailSent,
      actionCreated,
      error: errorMsg,
    });
  }

  return {
    error: null,
    data: { updated: overdueInvoices?.length ?? 0, results }
  };
}

/**
 * Create a credit note for an existing invoice.
 * Copies the invoice with negative amounts and links to the original.
 */
export async function createCreditNote(
  invoiceId: string
): Promise<ActionResult<string>> {
  const idCheck = uuidSchema.safeParse(invoiceId);
  if (!idCheck.success) return { error: "Ongeldig factuur-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Fetch original invoice with lines
  const originalResult = await getInvoice(invoiceId);
  if (originalResult.error || !originalResult.data) {
    return { error: originalResult.error ?? "Factuur niet gevonden." };
  }

  const original = originalResult.data;

  if (original.is_credit_note) {
    return { error: "Kan geen creditnota maken van een creditnota." };
  }

  // Generate credit note number
  const nextNumber = await queryNextInvoiceNumber(supabase, user.id);
  const creditNoteNumber = `CN-${nextNumber.replace(/^0+/, "") || nextNumber}`;

  // Create the credit note with negative amounts
  const { data: creditNote, error: insertError } = await supabase
    .from("invoices")
    .insert({
      user_id: user.id,
      client_id: original.client_id,
      invoice_number: creditNoteNumber,
      status: "sent",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: null,
      vat_rate: original.vat_rate,
      subtotal_ex_vat: -Math.abs(original.subtotal_ex_vat),
      vat_amount: -Math.abs(original.vat_amount),
      total_inc_vat: -Math.abs(original.total_inc_vat),
      notes: `Creditnota voor factuur ${original.invoice_number}`,
      is_credit_note: true,
      original_invoice_id: invoiceId,
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message };
  if (!creditNote) return { error: "Creditnota kon niet worden aangemaakt." };

  // Copy lines with negative amounts
  if (original.lines.length > 0) {
    const lineRows = original.lines.map((line, index) => ({
      invoice_id: creditNote.id,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      rate: -Math.abs(line.rate),
      amount: -Math.abs(line.amount),
      sort_order: index,
    }));

    const { error: linesError } = await supabase
      .from("invoice_lines")
      .insert(lineRows);

    if (linesError) {
      await supabase.from("invoices").delete().eq("id", creditNote.id);
      return { error: linesError.message };
    }
  }

  return { error: null, data: creditNote.id };
}

export async function duplicateInvoice(
  sourceId: string
): Promise<ActionResult<string>> {
  const idCheck = uuidSchema.safeParse(sourceId);
  if (!idCheck.success) return { error: "Ongeldig factuur-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Fetch the source invoice with lines
  const { data: source, error: fetchError } = await supabase
    .from("invoices")
    .select("*, lines:invoice_lines(*)")
    .eq("id", sourceId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !source) return { error: "Factuur niet gevonden." };

  // Generate a new invoice number
  const newNumber = await queryNextInvoiceNumber(supabase, user.id);

  const today = new Date().toISOString().split("T")[0];

  // Create the duplicate as a draft
  const { data: newInvoice, error: insertError } = await supabase
    .from("invoices")
    .insert({
      user_id: user.id,
      client_id: source.client_id,
      invoice_number: newNumber as string,
      status: "draft",
      issue_date: today,
      due_date: null,
      vat_rate: source.vat_rate,
      notes: source.notes,
      subtotal_ex_vat: source.subtotal_ex_vat,
      vat_amount: source.vat_amount,
      total_inc_vat: source.total_inc_vat,
    })
    .select("id")
    .single();

  if (insertError || !newInvoice) return { error: insertError?.message ?? "Kon factuur niet dupliceren." };

  // Copy lines
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
      invoice_id: newInvoice.id,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
      amount: line.amount,
      sort_order: line.sort_order,
    }));

    const { error: linesError } = await supabase
      .from("invoice_lines")
      .insert(lineRows);

    if (linesError) {
      await supabase.from("invoices").delete().eq("id", newInvoice.id);
      return { error: linesError.message };
    }
  }

  return { error: null, data: newInvoice.id };
}
