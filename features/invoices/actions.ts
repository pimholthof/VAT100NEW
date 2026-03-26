"use server";

import { requireAuth } from "@/lib/supabase/server";
import { sendInvoiceEmail } from "@/lib/email/send-invoice";
import { sendReminderEmail } from "@/lib/email/send-reminder";
import { fetchInvoiceData } from "@/lib/invoice/fetch";
import type {
  ActionResult,
  InvoiceInput,
  InvoiceStatus,
  InvoiceWithDetails,
} from "@/lib/types";
import { invoiceSchema, uuidSchema, validate } from "@/lib/validation";
import {
  createInvoice as createInvoiceInService,
  createCreditNote as createCreditNoteInService,
  deleteDraftInvoice as deleteDraftInvoiceInService,
  generateInvoiceNumber as generateInvoiceNumberInService,
  generateShareToken as generateShareTokenInService,
  getInvoice as getInvoiceInService,
  getInvoices as getInvoicesInService,
  getInvoiceSendInfo as getInvoiceSendInfoInService,
  updateInvoice as updateInvoiceInService,
  updateInvoiceStatus as updateInvoiceStatusInService,
} from "@/lib/services/invoice-repository";
import type { InvoiceWithClientName } from "@/lib/services/invoice-repository";
import { processOverdueInvoices as processOverdueInvoicesInService } from "@/lib/use-cases/process-overdue-invoices";

export type InvoiceWithClient = InvoiceWithClientName;

export async function generateInvoiceNumber(): Promise<ActionResult<string>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  try {
    const invoiceNumber = await generateInvoiceNumberInService(supabase, user.id);
    return { error: null, data: invoiceNumber };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
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

  try {
    const invoiceId = await createInvoiceInService(supabase, user.id, input);
    return { error: null, data: invoiceId };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
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

  try {
    await updateInvoiceInService(supabase, user.id, id, input);
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
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

  try {
    await updateInvoiceStatusInService(supabase, user.id, id, status);
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig factuur-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  try {
    await deleteDraftInvoiceInService(supabase, user.id, id);
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
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

  try {
    const invoices = await getInvoicesInService(supabase, user.id, filters);
    return { error: null, data: invoices };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getInvoice(
  id: string
): Promise<ActionResult<InvoiceWithDetails>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  try {
    const invoice = await getInvoiceInService(supabase, user.id, id);
    return { error: null, data: invoice };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function generateShareToken(
  invoiceId: string
): Promise<ActionResult<string>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  try {
    const token = await generateShareTokenInService(supabase, user.id, invoiceId);
    return { error: null, data: token };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function sendReminder(invoiceId: string, customMessage?: string): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  try {
    const info = await getInvoiceSendInfoInService(supabase, user.id, invoiceId);

    if (info.status !== "sent" && info.status !== "overdue") {
      return {
        error:
          "Herinneringen kunnen alleen worden verstuurd voor verzonden of verlopen facturen.",
      };
    }

    if (!info.clientEmail) {
      return { error: "Klant heeft geen e-mailadres." };
    }

    const result = await fetchInvoiceData(invoiceId);
    if (result.error || !result.data) {
      return { error: result.error ?? "Kon factuurgegevens niet ophalen." };
    }

    // Email is not a DB interaction; keeping in action layer.
    return sendReminderEmail(result.data, customMessage);
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function sendInvoice(id: string): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig factuur-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  try {
    const info = await getInvoiceSendInfoInService(supabase, user.id, id);

    if (info.status === "draft") {
      return { error: "Conceptfacturen kunnen niet worden verzonden." };
    }

    if (!info.clientEmail) {
      return { error: "Klant heeft geen e-mailadres." };
    }

    return sendInvoiceEmail(id);
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
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
  }>;  }>> {
  try {
    const data = await processOverdueInvoicesInService(userId);
    return { error: null, data };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Duplicate an invoice as a new draft.
 */
export async function duplicateInvoice(
  invoiceId: string
): Promise<ActionResult<string>> {
  const idCheck = uuidSchema.safeParse(invoiceId);
  if (!idCheck.success) return { error: "Ongeldig factuur-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  try {
    const original = await getInvoiceInService(supabase, user.id, invoiceId);
    const newNumber = await generateInvoiceNumberInService(supabase, user.id);
    const newId = await createInvoiceInService(supabase, user.id, {
      client_id: original.client_id,
      invoice_number: newNumber,
      status: "draft",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: null,
      vat_rate: original.vat_rate as import("@/lib/types").VatRate,
      notes: original.notes ?? null,
      lines: original.lines.map((l) => ({
        id: crypto.randomUUID(),
        description: l.description,
        quantity: l.quantity,
        unit: l.unit as import("@/lib/types").InvoiceUnit,
        rate: l.rate,
      })),
    });
    return { error: null, data: newId };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
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

  try {
    const creditNoteId = await createCreditNoteInService(supabase, user.id, invoiceId);
    return { error: null, data: creditNoteId };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
