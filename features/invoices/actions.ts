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
import { trackUserEvent } from "@/lib/analytics/tracking";
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

  // Dwing Nederlandse BTW-wetgeving af
  if (
    (input.vat_scheme === "eu_reverse_charge" || input.vat_scheme === "export_outside_eu") &&
    input.vat_rate !== 0
  ) {
    return { error: "BTW-tarief moet 0% zijn bij EU-levering of export buiten EU." };
  }

  try {
    const invoiceId = await createInvoiceInService(supabase, user.id, input);
    trackUserEvent(user.id, "invoice_created", { invoiceId, vatScheme: input.vat_scheme });
    return { error: null, data: invoiceId };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateInvoice(
  id: string,
  input: InvoiceInput
): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig factuur-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Verzonden facturen zijn onwijzigbaar
  const { data: current } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (current && current.status !== "draft") {
    return { error: "Verzonden facturen kunnen niet worden bewerkt. Maak een creditnota aan." };
  }

  const v = validate(invoiceSchema, input);
  if (v.error) return { error: v.error };

  // Dwing Nederlandse BTW-wetgeving af
  if (
    (input.vat_scheme === "eu_reverse_charge" || input.vat_scheme === "export_outside_eu") &&
    input.vat_rate !== 0
  ) {
    return { error: "BTW-tarief moet 0% zijn bij EU-levering of export buiten EU." };
  }

  try {
    await updateInvoiceInService(supabase, user.id, id, input);
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

// Toegestane status transities — voorkomt dat verzonden facturen terug naar draft gaan
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["paid", "overdue"],
  overdue: ["paid"],
  paid: [], // Betaalde facturen kunnen niet meer wijzigen
};

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus
): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig factuur-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Haal huidige status op voor transitie validatie
  const { data: current } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!current) return { error: "Factuur niet gevonden." };

  const allowed = ALLOWED_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(status)) {
    return { error: `Status kan niet worden gewijzigd van "${current.status}" naar "${status}".` };
  }

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
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig factuur-ID." };

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
  const idCheck = uuidSchema.safeParse(invoiceId);
  if (!idCheck.success) return { error: "Ongeldig factuur-ID." };

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
  const idCheck = uuidSchema.safeParse(invoiceId);
  if (!idCheck.success) return { error: "Ongeldig factuur-ID." };

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

    // Validate Dutch invoice requirements before sending
    const invoiceData = await fetchInvoiceData(id);
    if (invoiceData.data) {
      const { validateDutchInvoiceRequirements } = await import(
        "@/lib/validation/invoice-requirements"
      );
      const checks = validateDutchInvoiceRequirements(invoiceData.data);
      const errors = checks.filter((c) => !c.passed && c.severity === "error");
      if (errors.length > 0) {
        return {
          error: `Factuur voldoet niet aan wettelijke eisen: ${errors.map((e) => e.message).join("; ")}`,
        };
      }
    }

    // Auto-create Mollie payment link if not yet present
    const { data: inv } = await supabase
      .from("invoices")
      .select("payment_link, invoice_number, subtotal_ex_vat, vat_amount, issue_date, vat_scheme")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!inv?.payment_link) {
      await createPaymentLink(id).catch(() => {});
    }

    // Auto-book to ledger (debiteur -> omzet + BTW)
    if (inv) {
      const { autoBookInvoice } = await import("@/features/ledger/actions");
      await autoBookInvoice({
        invoiceId: id,
        userId: user.id,
        entryDate: inv.issue_date || new Date().toISOString().split("T")[0],
        description: `Factuur ${inv.invoice_number}`,
        subtotalExVat: Number(inv.subtotal_ex_vat) || 0,
        vatAmount: Number(inv.vat_amount) || 0,
        vatScheme: inv.vat_scheme ?? "standard",
        supabase,
      }).catch(() => {}); // Non-fatal
    }

    trackUserEvent(user.id, "invoice_sent", { invoiceId: id });
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

  // Blokkeer dubbele creditnota's voor dezelfde factuur
  const { data: existing } = await supabase
    .from("invoices")
    .select("id")
    .eq("user_id", user.id)
    .eq("original_invoice_id", invoiceId)
    .eq("is_credit_note", true)
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: "Er bestaat al een creditnota voor deze factuur." };
  }

  try {
    const creditNoteId = await createCreditNoteInService(supabase, user.id, invoiceId);
    trackUserEvent(user.id, "credit_note_created", { creditNoteId, originalInvoiceId: invoiceId });
    return { error: null, data: creditNoteId };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── Reminder History ───

export interface ReminderHistoryEntry {
  id: string;
  invoice_id: string;
  step: number;
  sent_at: string;
}

export async function getReminderHistory(
  invoiceId: string
): Promise<ActionResult<ReminderHistoryEntry[]>> {
  const idCheck = uuidSchema.safeParse(invoiceId);
  if (!idCheck.success) return { error: "Ongeldig factuur-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Verify invoice belongs to user
  const { error: invError } = await supabase
    .from("invoices")
    .select("id")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (invError) return { error: "Factuur niet gevonden." };

  const { data, error } = await supabase
    .from("invoice_reminders")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("sent_at", { ascending: false });

  if (error) return { error: error.message };
  return { error: null, data: (data ?? []) as ReminderHistoryEntry[] };
}

// ─── Invoice Requirements Validation ───

export async function validateInvoiceRequirements(
  invoiceId: string
): Promise<ActionResult<import("@/lib/validation/invoice-requirements").RequirementResult[]>> {
  const idCheck = uuidSchema.safeParse(invoiceId);
  if (!idCheck.success) return { error: "Ongeldig factuur-ID." };

  try {
    const result = await fetchInvoiceData(invoiceId);
    if (result.error || !result.data) {
      return { error: result.error ?? "Kon factuurgegevens niet ophalen." };
    }

    const { validateDutchInvoiceRequirements } = await import(
      "@/lib/validation/invoice-requirements"
    );
    const checks = validateDutchInvoiceRequirements(result.data);
    return { error: null, data: checks };
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

  // Als er al een betaallink is, retourneer die
  const existingMollieId = (invoice as Record<string, unknown>).mollie_payment_id as string | null;
  if (existingMollieId) {
    const { getMolliePayment } = await import("@/lib/payments/mollie");
    const { data: existing } = await getMolliePayment(existingMollieId);
    if (existing?._links?.checkout?.href && existing.status === "open") {
      return { error: null, data: { paymentLink: existing._links.checkout.href } };
    }
  }

  const { createMolliePayment, isMollieConfigured } = await import("@/lib/payments/mollie");

  if (!isMollieConfigured()) {
    return { error: "Mollie is niet geconfigureerd. Voeg MOLLIE_API_KEY toe." };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vat100.nl";
  const token = invoice.share_token;

  const { data: payment, error: paymentError } = await createMolliePayment({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    amount: Number(invoice.total_inc_vat),
    description: `Factuur ${invoice.invoice_number}`,
    redirectUrl: token
      ? `${baseUrl}/invoice/${token}?betaald=1`
      : `${baseUrl}/dashboard/invoices/${invoice.id}`,
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
    // Non-fatal: columns may not exist if migration hasn't run yet
  }

  if (!paymentLink) {
    return { error: "Mollie heeft geen betaallink teruggegeven." };
  }

  return { error: null, data: { paymentLink } };
}
