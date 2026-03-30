import type {
  InvoiceInput,
  InvoiceStatus,
  InvoiceWithDetails,
} from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateInvoiceLineAmount,
  calculateInvoiceTotals,
} from "@/lib/logic/invoice-calculations";

export type InvoiceWithClientName = {
  id: string;
  user_id: string;
  client_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  vat_rate: number;
  subtotal_ex_vat: number;
  vat_amount: number;
  total_inc_vat: number;
  notes: string | null;
  share_token: string | null;
  is_credit_note: boolean | null;
  payment_link: string | null;
  payment_method: string | null;
  created_at: string;
  client: { name: string } | null;
};

function isUniqueInvoiceNumberViolation(error: {
  code?: string | null;
  message?: string | null;
}): boolean {
  return (
    error.code === "23505" || Boolean(error.message?.includes("idx_invoices_user_number"))
  );
}

export async function generateInvoiceNumber(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data, error } = await supabase.rpc("generate_invoice_number", {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function createInvoice(
  supabase: SupabaseClient,
  userId: string,
  input: InvoiceInput
): Promise<string> {
  const totals = calculateInvoiceTotals(input.lines, input.vat_rate);

  const MAX_RETRIES = 3;
  let invoiceId: string | null = null;
  let invoiceNumber = input.invoice_number;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { data, error: insertError } = await supabase
      .from("invoices")
      .insert({
        user_id: userId,
        client_id: input.client_id,
        invoice_number: invoiceNumber,
        status: input.status,
        issue_date: input.issue_date,
        due_date: input.due_date,
        vat_rate: input.vat_rate,
        ...(input.vat_scheme && input.vat_scheme !== "standard" ? { vat_scheme: input.vat_scheme } : {}),
        notes: input.notes,
        subtotal_ex_vat: totals.subtotalExVat,
        vat_amount: totals.vatAmount,
        total_inc_vat: totals.totalIncVat,
      })
      .select("id")
      .single();

    if (!insertError) {
      invoiceId = (data as { id: string }).id;
      break;
    }

    if (!isUniqueInvoiceNumberViolation(insertError) || attempt === MAX_RETRIES - 1) {
      throw new Error(insertError.message);
    }

    invoiceNumber = await generateInvoiceNumber(supabase, userId);
  }

  if (!invoiceId) throw new Error("Factuurnummer kon niet worden gegenereerd.");

  if (input.lines.length > 0) {
    const lineRows = input.lines.map((line, index) => ({
      invoice_id: invoiceId,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
      amount: calculateInvoiceLineAmount(line),
      sort_order: index,
    }));

    const { error: linesError } = await supabase
      .from("invoice_lines")
      .insert(lineRows);

    if (linesError) {
      await supabase.from("invoices").delete().eq("id", invoiceId);
      throw new Error(linesError.message);
    }
  }

  return invoiceId;
}

export async function updateInvoice(
  supabase: SupabaseClient,
  userId: string,
  invoiceId: string,
  input: InvoiceInput
): Promise<void> {
  const totals = calculateInvoiceTotals(input.lines, input.vat_rate);

  const { error: invoiceError } = await supabase
    .from("invoices")
    .update({
      client_id: input.client_id,
      invoice_number: input.invoice_number,
      status: input.status,
      issue_date: input.issue_date,
      due_date: input.due_date,
      vat_rate: input.vat_rate,
      ...(input.vat_scheme && input.vat_scheme !== "standard" ? { vat_scheme: input.vat_scheme } : {}),
      notes: input.notes,
      subtotal_ex_vat: totals.subtotalExVat,
      vat_amount: totals.vatAmount,
      total_inc_vat: totals.totalIncVat,
    })
    .eq("id", invoiceId)
    .eq("user_id", userId);

  if (invoiceError) throw new Error(invoiceError.message);

  const { error: deleteError } = await supabase
    .from("invoice_lines")
    .delete()
    .eq("invoice_id", invoiceId);

  if (deleteError) throw new Error(deleteError.message);

  if (input.lines.length > 0) {
    const lineRows = input.lines.map((line, index) => ({
      invoice_id: invoiceId,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
      amount: calculateInvoiceLineAmount(line),
      sort_order: index,
    }));

    const { error: linesError } = await supabase
      .from("invoice_lines")
      .insert(lineRows);
    if (linesError) throw new Error(linesError.message);
  }
}

export async function updateInvoiceStatus(
  supabase: SupabaseClient,
  userId: string,
  invoiceId: string,
  status: InvoiceStatus
): Promise<void> {
  const { error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", invoiceId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function deleteDraftInvoice(
  supabase: SupabaseClient,
  userId: string,
  invoiceId: string
): Promise<void> {
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .single();

  if (invoiceError) throw new Error(invoiceError.message);
  if (!invoice) throw new Error("Factuur niet gevonden.");
  if ((invoice as { status: InvoiceStatus }).status !== "draft") {
    throw new Error("Alleen conceptfacturen kunnen worden verwijderd.");
  }

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export type GetInvoicesFilters = {
  search?: string;
  status?: InvoiceStatus;
  dateFrom?: string;
  dateTo?: string;
};

export async function getInvoices(
  supabase: SupabaseClient,
  userId: string,
  filters?: GetInvoicesFilters
): Promise<InvoiceWithClientName[]> {
  let query = supabase
    .from("invoices")
    .select("*, client:clients(name)")
    .eq("user_id", userId)
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
  if (error) throw new Error(error.message);

  let results = (data ?? []) as unknown as InvoiceWithClientName[];

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (inv) =>
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.client?.name?.toLowerCase().includes(q) ||
        String(inv.total_inc_vat).includes(q)
    );
  }

  return results;
}

export async function getInvoice(
  supabase: SupabaseClient,
  userId: string,
  invoiceId: string
): Promise<InvoiceWithDetails> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, lines:invoice_lines(*), client:clients(*)")
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .order("sort_order", {
      referencedTable: "invoice_lines",
      ascending: true,
    })
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Factuur niet gevonden.");

  const { lines, client, ...invoice } = data as unknown as InvoiceWithDetails;
  return { ...invoice, lines: lines ?? [], client };
}

export async function generateShareToken(
  supabase: SupabaseClient,
  userId: string,
  invoiceId: string
): Promise<string> {
  const { data: invoice, error: selectError } = await supabase
    .from("invoices")
    .select("share_token")
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .single();

  if (selectError) throw new Error(selectError.message);
  if (!invoice) throw new Error("Factuur niet gevonden.");

  const existing = (invoice as { share_token: string | null }).share_token;
  if (existing) return existing;

  const token = crypto.randomUUID().replace(/-/g, "");

  const { error } = await supabase
    .from("invoices")
    .update({ share_token: token })
    .eq("id", invoiceId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return token;
}

export async function getInvoiceSendInfo(
  supabase: SupabaseClient,
  userId: string,
  invoiceId: string
): Promise<{ status: InvoiceStatus; clientEmail: string | null }> {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("status, client:clients(email)")
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .single();

  if (error) throw new Error(error.message);
  if (!invoice) throw new Error("Factuur niet gevonden.");

  const status = (invoice as { status: InvoiceStatus }).status;
  const client = (invoice as unknown as {
    client: { email: string | null } | null;
  }).client;

  return { status, clientEmail: client?.email ?? null };
}

export async function createCreditNote(
  supabase: SupabaseClient,
  userId: string,
  invoiceId: string
): Promise<string> {
  const original = await getInvoice(supabase, userId, invoiceId);

  if (original.is_credit_note) {
    throw new Error("Kan geen creditnota maken van een creditnota.");
  }

  const { data: nextNumber, error: rpcError } = await supabase.rpc(
    "generate_invoice_number",
    { p_user_id: userId }
  );
  if (rpcError) throw new Error(rpcError.message);

  const creditNoteNumber = `CN-${(nextNumber as string).replace(/^0+/, "") || nextNumber}`;
  const today = new Date().toISOString().split("T")[0];

  const { data: creditNote, error: insertError } = await supabase
    .from("invoices")
    .insert({
      user_id: userId,
      client_id: original.client_id,
      invoice_number: creditNoteNumber,
      status: "sent",
      issue_date: today,
      due_date: null,
      vat_rate: original.vat_rate,
      ...(original.vat_scheme && original.vat_scheme !== "standard" ? { vat_scheme: original.vat_scheme } : {}),
      subtotal_ex_vat: -Math.abs(original.subtotal_ex_vat),
      vat_amount: -Math.abs(original.vat_amount),
      total_inc_vat: -Math.abs(original.total_inc_vat),
      notes: `Creditnota voor factuur ${original.invoice_number}`,
      is_credit_note: true,
      original_invoice_id: invoiceId,
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);
  if (!creditNote) throw new Error("Creditnota kon niet worden aangemaakt.");

  if (original.lines.length > 0) {
    const lineRows = original.lines.map((line, index) => ({
      invoice_id: (creditNote as { id: string }).id,
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
      await supabase.from("invoices").delete().eq("id", (creditNote as { id: string }).id);
      throw new Error(linesError.message);
    }
  }

  return (creditNote as { id: string }).id;
}
