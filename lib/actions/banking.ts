"use server";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult, BankConnection, BankTransaction } from "@/lib/types";

export async function getBankConnections(): Promise<ActionResult<BankConnection[]>> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const { data, error } = await supabase
    .from("bank_connections")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { error: null, data: data ?? [] };
}

export async function getBankTransactions(filters?: {
  from?: string;
  to?: string;
  category?: string;
}): Promise<ActionResult<BankTransaction[]>> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  let query = supabase
    .from("bank_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("booking_date", { ascending: false });

  if (filters?.from) {
    query = query.gte("booking_date", filters.from);
  }
  if (filters?.to) {
    query = query.lte("booking_date", filters.to);
  }
  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  const { data, error } = await query;

  if (error) return { error: error.message };
  return { error: null, data: data ?? [] };
}

export async function categorizeTransaction(
  id: string,
  category: string
): Promise<ActionResult> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const { error } = await supabase
    .from("bank_transactions")
    .update({ category })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function linkTransactionToInvoice(
  transactionId: string,
  invoiceId: string
): Promise<ActionResult> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const { error } = await supabase
    .from("bank_transactions")
    .update({ linked_invoice_id: invoiceId })
    .eq("id", transactionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function linkTransactionToReceipt(
  transactionId: string,
  receiptId: string
): Promise<ActionResult> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const { error } = await supabase
    .from("bank_transactions")
    .update({ linked_receipt_id: receiptId })
    .eq("id", transactionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

// TODO: GoCardless API — Initiates a bank connection via GoCardless Bank Account Data.
// In production, this will redirect the user to GoCardless to authorize access.
export async function initiateBankConnection(
  institutionId: string
): Promise<ActionResult<{ redirectUrl: string }>> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  // Placeholder: create a pending connection record
  const { data, error } = await supabase
    .from("bank_connections")
    .insert({
      user_id: user.id,
      institution_id: institutionId,
      institution_name: `Bank (${institutionId})`,
      status: "pending",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // TODO: GoCardless API — Replace with actual GoCardless requisition creation
  // const requisition = await gocardless.createRequisition({ ... });
  // return { error: null, data: { redirectUrl: requisition.link } };

  return {
    error: null,
    data: { redirectUrl: `/dashboard/bank?connected=${data.id}` },
  };
}

// TODO: GoCardless API — Completes a bank connection after user returns from GoCardless.
export async function completeBankConnection(
  requisitionId: string
): Promise<ActionResult> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  // TODO: GoCardless API — Fetch requisition status, get account details
  // const requisition = await gocardless.getRequisition(requisitionId);
  // const account = await gocardless.getAccountDetails(requisition.accounts[0]);

  const { error } = await supabase
    .from("bank_connections")
    .update({
      status: "active",
      requisition_id: requisitionId,
      // TODO: GoCardless API — Set real account_id and iban from API response
      account_id: `placeholder_${requisitionId}`,
      iban: null,
    })
    .eq("id", requisitionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

// TODO: GoCardless API — Syncs transactions from a linked bank account.
export async function syncTransactions(
  connectionId: string
): Promise<ActionResult<number>> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  // Verify the connection belongs to this user
  const { data: connection, error: connError } = await supabase
    .from("bank_connections")
    .select("*")
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .single();

  if (connError || !connection) {
    return { error: "Bankverbinding niet gevonden." };
  }

  // TODO: GoCardless API — Fetch transactions from GoCardless
  // const transactions = await gocardless.getTransactions(connection.account_id);
  // For now, return 0 synced transactions

  // Update last_synced_at
  await supabase
    .from("bank_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connectionId)
    .eq("user_id", user.id);

  return { error: null, data: 0 };
}

export async function deleteBankConnection(
  id: string
): Promise<ActionResult> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const { error } = await supabase
    .from("bank_connections")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}
