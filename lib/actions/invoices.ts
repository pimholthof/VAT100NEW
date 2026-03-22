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
import { invoiceSchema, validate } from "@/lib/validation";
import { calculateLineTotals } from "@/lib/format";
import { createServiceClient } from "@/lib/supabase/service";
import type { InvoiceData } from "@/lib/types";

export type InvoiceWithClient = Invoice & {
  client: { name: string } | null;
};

export async function generateInvoiceNumber(): Promise<ActionResult<string>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase.rpc("generate_invoice_number", {
    p_user_id: user.id,
  });

  if (error) return { error: error.message };

  return { error: null, data: data as string };
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

    // Regenerate invoice number via the atomic DB function
    const { data: newNumber, error: rpcError } = await supabase.rpc(
      "generate_invoice_number",
      { p_user_id: user.id }
    );
    if (rpcError) return { error: rpcError.message };
    invoiceNumber = newNumber as string;
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
      const { error: rollbackError } = await supabase.from("invoices").delete().eq("id", invoice.id);
      if (rollbackError) {
        console.error("Rollback mislukt voor factuur", invoice.id, rollbackError.message);
      }
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

  // Immutability: alleen conceptfacturen mogen gewijzigd worden
  const { data: existing } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) return { error: "Factuur niet gevonden" };
  if (existing.status !== "draft") {
    return { error: "Alleen conceptfacturen kunnen gewijzigd worden. Verzonden en betaalde facturen zijn vergrendeld." };
  }

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
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  // Auto-create tax reservation when invoice is marked as paid
  if (status === "paid") {
    const { createTaxReservation } = await import("@/lib/actions/tax");
    await createTaxReservation(id);
  }

  return { error: null };
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Atomic: only delete if still a draft (lines cascade-delete via FK)
  const { data, error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "draft")
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "Factuur niet gevonden of is geen concept meer." };
  }
  return { error: null };
}

export async function getInvoices(): Promise<ActionResult<InvoiceWithClient[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("invoices")
    .select("*, client:clients(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { error: null, data: (data ?? []) as unknown as InvoiceWithClient[] };
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
    .select("share_token, share_token_expires_at")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (!invoice) return { error: "Factuur niet gevonden." };

  // Return existing token if already generated and not expired
  if (invoice.share_token) {
    const expiresAt = invoice.share_token_expires_at
      ? new Date(invoice.share_token_expires_at)
      : null;
    if (!expiresAt || expiresAt > new Date()) {
      return { error: null, data: invoice.share_token };
    }
  }

  const token = crypto.randomUUID().replace(/-/g, "");
  const tokenExpiresAt = new Date();
  tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 90);

  const { error } = await supabase
    .from("invoices")
    .update({
      share_token: token,
      share_token_expires_at: tokenExpiresAt.toISOString(),
    })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null, data: token };
}

export async function sendReminder(invoiceId: string, customMessage?: string): Promise<ActionResult> {
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
    error?: string;
  }>;
}>> {
  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  // 1. Find overdue candidates (SELECT first, update per-invoice after processing)
  let query = supabase
    .from("invoices")
    .select("id, user_id, invoice_number, client_id, total_inc_vat, due_date, issue_date, subtotal_ex_vat, vat_amount")
    .eq("status", "sent")
    .lt("due_date", today);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data: overdueInvoices, error } = await query;

  if (error) return { error: error.message };

  const results: Array<{
    invoiceNumber: string;
    emailSent: boolean;
    error?: string;
  }> = [];

  for (const inv of overdueInvoices ?? []) {
    let emailSent = false;
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

      // Mark as overdue AFTER processing (idempotent: re-runs won't re-process)
      await supabase
        .from("invoices")
        .update({ status: "overdue" })
        .eq("id", inv.id);

    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    results.push({
      invoiceNumber: inv.invoice_number,
      emailSent,
      error: errorMsg,
    });
  }

  return { 
    error: null, 
    data: { updated: overdueInvoices?.length ?? 0, results } 
  };
}
