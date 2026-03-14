"use server";

import { createClient } from "@/lib/supabase/server";
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

function calculateTotals(
  lines: { quantity: number; rate: number }[],
  vatRate: number
) {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.quantity * line.rate,
    0
  );
  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const vatAmount = Math.round(roundedSubtotal * (vatRate / 100) * 100) / 100;
  const total = Math.round((roundedSubtotal + vatAmount) * 100) / 100;
  return {
    subtotal_ex_vat: roundedSubtotal,
    vat_amount: vatAmount,
    total_inc_vat: total,
  };
}

export async function generateInvoiceNumber(): Promise<ActionResult<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const { data, error } = await supabase.rpc("generate_invoice_number", {
    p_user_id: user.id,
  });

  if (error) return { error: error.message };

  return { error: null, data: data as string };
}

export async function createInvoice(
  input: InvoiceInput
): Promise<ActionResult<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const totals = calculateTotals(input.lines, input.vat_rate);

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const totals = calculateTotals(input.lines, input.vat_rate);

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const { error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

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

export async function getInvoices(): Promise<ActionResult<Invoice[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const { data, error } = await supabase
    .from("invoices")
    .select("*, client:clients(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { error: null, data: data ?? [] };
}

export async function getInvoice(
  id: string
): Promise<ActionResult<InvoiceWithDetails>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (invoiceError) return { error: invoiceError.message };
  if (!invoice) return { error: "Factuur niet gevonden." };

  const { data: lines, error: linesError } = await supabase
    .from("invoice_lines")
    .select("*")
    .eq("invoice_id", id)
    .order("sort_order", { ascending: true });

  if (linesError) return { error: linesError.message };

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", invoice.client_id)
    .single();

  if (clientError) return { error: clientError.message };

  return {
    error: null,
    data: { ...invoice, lines: lines ?? [], client },
  };
}

export async function generateShareToken(
  invoiceId: string
): Promise<ActionResult<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

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

  const { error } = await supabase
    .from("invoices")
    .update({ share_token: token })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null, data: token };
}

export async function sendReminder(invoiceId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  // Verify ownership and status
  const { data: invoice } = await supabase
    .from("invoices")
    .select("status, client_id")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (!invoice) return { error: "Factuur niet gevonden." };

  if (invoice.status !== "sent" && invoice.status !== "overdue") {
    return { error: "Herinneringen kunnen alleen worden verstuurd voor verzonden of verlopen facturen." };
  }

  const { data: client } = await supabase
    .from("clients")
    .select("email")
    .eq("id", invoice.client_id)
    .single();

  if (!client?.email) {
    return { error: "Klant heeft geen e-mailadres." };
  }

  const result = await fetchInvoiceData(invoiceId);
  if (result.error || !result.data) {
    return { error: result.error ?? "Kon factuurgegevens niet ophalen." };
  }
  return sendReminderEmail(result.data);
}

export async function sendInvoice(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  // Verify ownership
  const { data: invoice } = await supabase
    .from("invoices")
    .select("status, client_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!invoice) return { error: "Factuur niet gevonden." };

  if (invoice.status === "draft") {
    return { error: "Conceptfacturen kunnen niet worden verzonden." };
  }

  const { data: client } = await supabase
    .from("clients")
    .select("email")
    .eq("id", invoice.client_id)
    .single();

  if (!client?.email) {
    return { error: "Klant heeft geen e-mailadres." };
  }

  return sendInvoiceEmail(id);
}
