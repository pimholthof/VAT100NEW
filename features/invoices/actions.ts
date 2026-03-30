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

    // Auto-create payment link for non-draft invoices (best-effort)
    if (input.status !== "draft") {
      createPaymentLink(invoiceId).catch(() => {});
    }

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

    // Ensure payment link is valid before sending reminder
    const { data: inv } = await supabase
      .from("invoices")
      .select("payment_link, mollie_payment_id")
      .eq("id", invoiceId)
      .eq("user_id", user.id)
      .single();

    if (!inv?.payment_link) {
      await createPaymentLink(invoiceId).catch(() => {});
    } else if (inv.mollie_payment_id) {
      // Check if existing payment is still valid
      const { getMolliePayment } = await import("@/lib/payments/mollie");
      const { data: existing } = await getMolliePayment(inv.mollie_payment_id);
      if (existing && ["expired", "canceled", "failed"].includes(existing.status)) {
        // Reset and create fresh link
        await supabase
          .from("invoices")
          .update({ mollie_payment_id: null, payment_link: null } as Record<string, unknown>)
          .eq("id", invoiceId)
          .eq("user_id", user.id);
        await createPaymentLink(invoiceId).catch(() => {});
      }
    }

    const result = await fetchInvoiceData(invoiceId);
    if (result.error || !result.data) {
      return { error: result.error ?? "Kon factuurgegevens niet ophalen." };
    }

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

    // Auto-create Mollie payment link if not yet present
    const { data: inv } = await supabase
      .from("invoices")
      .select("payment_link")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!inv?.payment_link) {
      // Best-effort: don't block sending if payment link creation fails
      await createPaymentLink(id).catch(() => {});
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
      vat_scheme: original.vat_scheme ?? "standard",
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

// ─── Mollie Payment Link ───

export async function createPaymentLink(
  invoiceId: string,
): Promise<ActionResult<{ paymentLink: string }>> {
  const idCheck = uuidSchema.safeParse(invoiceId);
  if (!idCheck.success) return { error: "Ongeldig factuur-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Haal factuurgegevens op (gebruik * voor compatibiliteit met migraties)
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (invoiceError || !invoice) {
    return { error: "Factuur niet gevonden." };
  }

  if (invoice.status === "paid") {
    return { error: "Factuur is al betaald." };
  }

  // Bedrag validatie
  const amount = Number(invoice.total_inc_vat);
  if (!amount || amount <= 0) {
    return { error: "Factuurbedrag moet groter dan €0 zijn." };
  }

  // Als er al een Mollie payment is, check de status
  const existingMollieId = (invoice as Record<string, unknown>).mollie_payment_id as string | null;
  if (existingMollieId) {
    const { getMolliePayment } = await import("@/lib/payments/mollie");
    const { data: existing } = await getMolliePayment(existingMollieId);
    if (existing?._links?.checkout?.href && existing.status === "open") {
      // Bestaande actieve link hergebruiken
      return { error: null, data: { paymentLink: existing._links.checkout.href } };
    }
    // Expired/canceled/failed: reset zodat we een nieuwe kunnen aanmaken
    if (existing && ["expired", "canceled", "failed"].includes(existing.status)) {
      await supabase
        .from("invoices")
        .update({ mollie_payment_id: null, payment_link: null } as Record<string, unknown>)
        .eq("id", invoice.id)
        .eq("user_id", user.id);
    }
  }

  const { createMolliePayment, isMollieConfigured } = await import("@/lib/payments/mollie");

  if (!isMollieConfigured()) {
    return { error: "Mollie is niet geconfigureerd. Voeg MOLLIE_API_KEY toe." };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vat100.nl";
  let token = invoice.share_token;

  // Genereer share_token als die ontbreekt (nodig voor redirect na betaling)
  if (!token) {
    token = crypto.randomUUID();
    await supabase
      .from("invoices")
      .update({ share_token: token })
      .eq("id", invoice.id)
      .eq("user_id", user.id);
  }

  const { data: payment, error: paymentError } = await createMolliePayment({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    amount,
    description: `Factuur ${invoice.invoice_number}`,
    redirectUrl: `${baseUrl}/invoice/${token}?betaald=1`,
    webhookUrl: `${baseUrl}/api/webhooks/mollie`,
  });

  if (paymentError || !payment) {
    return { error: paymentError ?? "Kon betaallink niet aanmaken." };
  }

  const paymentLink = payment._links?.checkout?.href ?? null;

  // Sla betaalgegevens op (kolommen bestaan mogelijk nog niet als migratie niet is gedraaid)
  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      mollie_payment_id: payment.id,
      payment_link: paymentLink,
    } as Record<string, unknown>)
    .eq("id", invoice.id)
    .eq("user_id", user.id);

  // Niet-fatale fout als kolommen nog niet bestaan
  if (updateError) {
    console.warn("Kon betaalgegevens niet opslaan (migratie nodig?):", updateError.message);
  }

  if (!paymentLink) {
    return { error: "Mollie heeft geen betaallink teruggegeven." };
  }

  return { error: null, data: { paymentLink } };
}
