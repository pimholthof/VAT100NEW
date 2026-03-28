"use server";

import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth, requirePlan } from "@/lib/supabase/server";
import { gocardless, checkGoCardlessRateLimit } from "@/lib/banking/gocardless";
import type { ActionResult, BankConnection, BankTransaction } from "@/lib/types";
import { uuidSchema } from "@/lib/validation";
import { KOSTENSOORTEN } from "@/lib/constants/costs";

export async function getBankConnections(): Promise<ActionResult<BankConnection[]>> {
  // Feature-gate: Bank koppeling is Compleet-only
  const planCheck = await requirePlan("compleet");
  if (planCheck.error) return { error: planCheck.error };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

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
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

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
  if (!uuidSchema.safeParse(id).success) return { error: "Ongeldig transactie-ID." };
  if (!category.trim()) return { error: "Categorie is verplicht." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

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
  if (!uuidSchema.safeParse(transactionId).success) return { error: "Ongeldig transactie-ID." };
  if (!uuidSchema.safeParse(invoiceId).success) return { error: "Ongeldig factuur-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

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
  if (!uuidSchema.safeParse(transactionId).success) return { error: "Ongeldig transactie-ID." };
  if (!uuidSchema.safeParse(receiptId).success) return { error: "Ongeldig bon-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("bank_transactions")
    .update({ linked_receipt_id: receiptId })
    .eq("id", transactionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function initiateBankConnection(
  institutionId: string
): Promise<ActionResult<{ redirectUrl: string }>> {
  if (!institutionId.trim()) return { error: "Instituut-ID is verplicht." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  if (checkGoCardlessRateLimit(user.id)) {
    return { error: "Te veel bankverzoeken. Probeer het over een minuut opnieuw." };
  }

  try {
    const reference = crypto.randomUUID();
    const requisition = await gocardless.createRequisition({
      institutionId,
      redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard/bank?reference=${reference}`,
      reference,
    });

    const { error } = await supabase
      .from("bank_connections")
      .insert({
        user_id: user.id,
        institution_id: institutionId,
        institution_name: `Bank (${institutionId})`,
        status: "pending",
        requisition_id: requisition.id,
        reference,
      });

    if (error) return { error: error.message };

    return {
      error: null,
      data: { redirectUrl: requisition.link },
    };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function completeBankConnection(
  requisitionId: string
): Promise<ActionResult> {
  if (!requisitionId.trim()) return { error: "Requisition-ID is verplicht." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  try {
    const requisition = await gocardless.getRequisition(requisitionId);
    
    // In many cases, we take the first account returned by the requisition
    const accountId = requisition.accounts[0];
    if (!accountId) return { error: "Geen rekeningen gevonden bij deze bank." };

    const accountDetails = await gocardless.getAccountDetails(accountId);
    const detail = accountDetails.account;

    const { error } = await supabase
      .from("bank_connections")
      .update({
        status: "active",
        account_id: accountId,
        iban: detail.iban || null,
        institution_name: requisition.institution_id, // We'll improve this with actual name later
      })
      .eq("requisition_id", requisitionId)
      .eq("user_id", user.id);

    if (error) return { error: error.message };
    
    // Trigger initial sync
    await syncTransactions(requisitionId, true);

    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function syncTransactions(
  connectionIdOrReqId: string,
  isReqId = false
): Promise<ActionResult<number>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // 1. Fetch connection
  const query = supabase
    .from("bank_connections")
    .select("*")
    .eq("user_id", user.id);
  
  const { data: connection, error: connError } = await (isReqId 
    ? query.eq("requisition_id", connectionIdOrReqId)
    : query.eq("id", connectionIdOrReqId)
  ).single();

  if (connError || !connection) {
    return { error: "Bankverbinding niet gevonden." };
  }

  if (!connection.account_id) return { error: "Bankrekening ID ontbreekt." };

  if (checkGoCardlessRateLimit(user.id)) {
    return { error: "Te veel bankverzoeken. Probeer het over een minuut opnieuw." };
  }

  try {
    // 2. Fetch transactions from GoCardless
    const response = await gocardless.getTransactions(connection.account_id);
    const booked = response.transactions.booked || [];

    // 3. Map to our schema
    const newTransactions = booked.map((t: {
      internalTransactionId?: string;
      transactionId?: string;
      transactionAmount: { amount: string; currency: string };
      remittanceInformationUnstructured?: string;
      additionalInformation?: string;
      debtorName?: string;
      creditorName?: string;
      debtorAccount?: { iban?: string };
      creditorAccount?: { iban?: string };
      bookingDate?: string;
      valueDate?: string;
    }) => ({
      user_id: user.id,
      bank_connection_id: connection.id,
      external_id: t.internalTransactionId || t.transactionId,
      amount: parseFloat(t.transactionAmount.amount),
      currency: t.transactionAmount.currency,
      description: t.remittanceInformationUnstructured || t.additionalInformation || "",
      counterpart_name: t.debtorName || t.creditorName || "",
      counterpart_iban: t.debtorAccount?.iban || t.creditorAccount?.iban || "",
      booking_date: t.bookingDate || t.valueDate,
      status: "booked",
    }));

    // 4. Upsert (ignore duplicates based on external_id)
    if (newTransactions.length > 0) {
      const { error: upsertError } = await supabase
        .from("bank_transactions")
        .upsert(newTransactions, { onConflict: "external_id" });
      
      if (upsertError) return { error: upsertError.message };
    }

    // 5. Update last_synced_at
    await supabase
      .from("bank_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", connection.id);

    return { error: null, data: newTransactions.length };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteBankConnection(
  id: string
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

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
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

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

  type CatRule = { counterpart_pattern: string; category: string; is_income: boolean };
  const rulesMap = new Map<string, CatRule>(
    (rules ?? []).map((r: CatRule) => [r.counterpart_pattern.toLowerCase(), r])
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
        model: "claude-sonnet-4-6",
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

      const aiCategorySchema = z.array(
        z.object({
          id: z.string(),
          category: z.string(),
          is_income: z.boolean(),
        })
      );
      const parseResult = aiCategorySchema.safeParse(JSON.parse(jsonMatch[0]));
      if (!parseResult.success) continue;
      const parsed = parseResult.data;

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
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

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
