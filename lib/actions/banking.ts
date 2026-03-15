"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult, BankConnection, BankTransaction } from "@/lib/types";
import { KOSTENSOORTEN } from "@/lib/constants/costs";

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

const AI_CATEGORIES = [
  "Omzet",
  ...KOSTENSOORTEN.map((k) => k.label),
];

export async function autoCategorizeTransactions(
  transactionIds: string[]
): Promise<ActionResult<Record<string, string>>> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  // Fetch the transactions
  const { data: transactions, error: fetchError } = await supabase
    .from("bank_transactions")
    .select("id, description, counterpart_name, amount")
    .eq("user_id", user.id)
    .in("id", transactionIds);

  if (fetchError) return { error: fetchError.message };
  if (!transactions || transactions.length === 0) {
    return { error: null, data: {} };
  }

  // Fetch existing categorization rules for this user
  const { data: rules } = await supabase
    .from("categorization_rules")
    .select("counterpart_pattern, category, is_income")
    .eq("user_id", user.id);

  const rulesMap = new Map(
    (rules ?? []).map((r) => [r.counterpart_pattern.toLowerCase(), r])
  );

  // Separate transactions that match existing rules from those needing AI
  const results: Record<string, string> = {};
  const needsAI: typeof transactions = [];

  const ruleMatched: { id: string; category: string; is_income: boolean }[] = [];

  for (const tx of transactions) {
    const key = (tx.counterpart_name ?? "").toLowerCase();
    const rule = rulesMap.get(key);
    if (rule && key) {
      ruleMatched.push({ id: tx.id, category: rule.category, is_income: rule.is_income });
      results[tx.id] = rule.category;
    } else {
      needsAI.push(tx);
    }
  }

  // Batch update rule-matched transactions
  await Promise.all(
    ruleMatched.map((item) =>
      supabase
        .from("bank_transactions")
        .update({ category: item.category, is_income: item.is_income })
        .eq("id", item.id)
        .eq("user_id", user.id)
    )
  );

  if (needsAI.length === 0) {
    return { error: null, data: results };
  }

  // Batch in groups of 20
  const batches: (typeof needsAI)[] = [];
  for (let i = 0; i < needsAI.length; i += 20) {
    batches.push(needsAI.slice(i, i + 20));
  }

  const anthropic = new Anthropic();
  const categoryList = AI_CATEGORIES.join(", ");

  for (const batch of batches) {
    const input = batch.map((tx) => ({
      id: tx.id,
      description: tx.description,
      counterpart_name: tx.counterpart_name,
      amount: tx.amount,
    }));

    try {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: `Je categoriseert banktransacties voor een Nederlandse freelancer/ZZP'er.
Categoriseer elke transactie in exact één van deze categorieën: ${categoryList}.
Markeer ook of het inkomsten (is_income: true) of uitgaven (is_income: false) zijn.
Retourneer ALLEEN een JSON array met objecten: [{id, category, is_income}]`,
        messages: [
          {
            role: "user",
            content: JSON.stringify(input),
          },
        ],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "";
      // Extract JSON from response (may be wrapped in markdown code block)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;

      const parsed: { id: string; category: string; is_income: boolean }[] =
        JSON.parse(jsonMatch[0]);

      // Batch update AI-categorized transactions
      const validItems = parsed.filter((item) => AI_CATEGORIES.includes(item.category));
      await Promise.all(
        validItems.map((item) =>
          supabase
            .from("bank_transactions")
            .update({ category: item.category, is_income: item.is_income })
            .eq("id", item.id)
            .eq("user_id", user.id)
        )
      );
      for (const item of validItems) {
        results[item.id] = item.category;
      }
    } catch {
      // Continue with next batch on error
      continue;
    }
  }

  return { error: null, data: results };
}

export async function learnFromCorrection(
  transactionId: string,
  newCategory: string
): Promise<ActionResult> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  // Fetch the transaction to get counterpart_name
  const { data: tx, error: fetchError } = await supabase
    .from("bank_transactions")
    .select("counterpart_name, amount")
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !tx) return { error: "Transactie niet gevonden." };
  if (!tx.counterpart_name) return { error: null }; // No counterpart to learn from

  const isIncome = newCategory === "Omzet" || Number(tx.amount) > 0;

  // Upsert the rule
  const { error } = await supabase
    .from("categorization_rules")
    .upsert(
      {
        user_id: user.id,
        counterpart_pattern: tx.counterpart_name.toLowerCase(),
        category: newCategory,
        is_income: isIncome,
      },
      { onConflict: "user_id,counterpart_pattern" }
    );

  if (error) return { error: error.message };
  return { error: null };
}
