"use server";

import { requireAuth, createClient } from "@/lib/supabase/server";
import type { ActionResult, ActionFeedItem } from "@/lib/types";

/**
 * Fetch all pending action items for the current user (the "Inbox").
 */
export async function getActionFeedItems(): Promise<ActionResult<ActionFeedItem[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("action_feed")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return { error: error.message };
  return { error: null, data: (data as ActionFeedItem[]) ?? [] };
}

/**
 * Resolve an action item (user confirmed the suggestion or uploaded the receipt).
 */
export async function resolveActionItem(
  itemId: string,
  category?: string
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("action_feed")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("user_id", user.id);

  // If a category was provided and there's a related transaction, categorize it
  if (!error && category) {
    const { data: item } = await supabase
      .from("action_feed")
      .select("related_transaction_id")
      .eq("id", itemId)
      .single();

    if (item?.related_transaction_id) {
      await supabase
        .from("bank_transactions")
        .update({ category })
        .eq("id", item.related_transaction_id);
    }
  }

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Ignore an action item (user decided this is irrelevant).
 */
export async function ignoreActionItem(itemId: string): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("action_feed")
    .update({
      status: "ignored",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Agent 2: The Reconciliation Engine.
 * Scans for uncategorized transactions and generates action items.
 * This runs as a background process (called from a cron or API route).
 */
export async function runReconciliationAgent(userId: string): Promise<ActionResult<{ created: number }>> {
  const supabase = await createClient();

  // 1. Find uncategorized bank transactions with no existing pending action
  const { data: uncategorized, error: txError } = await supabase
    .from("bank_transactions")
    .select("id, description, counterpart_name, amount, booking_date")
    .eq("user_id", userId)
    .is("category", null)
    .order("booking_date", { ascending: false })
    .limit(50);

  if (txError) return { error: txError.message };
  if (!uncategorized || uncategorized.length === 0) {
    return { error: null, data: { created: 0 } };
  }

  // 2. Check which transactions already have pending actions
  const txIds = uncategorized.map((tx) => tx.id);
  const { data: existingActions } = await supabase
    .from("action_feed")
    .select("related_transaction_id")
    .eq("user_id", userId)
    .eq("status", "pending")
    .in("related_transaction_id", txIds);

  const existingTxIds = new Set(
    (existingActions ?? []).map((a) => a.related_transaction_id)
  );

  // 3. Try to match transactions to receipts (simple: amount + date range)
  const newActions: Array<{
    user_id: string;
    type: string;
    title: string;
    description: string;
    amount: number;
    related_transaction_id: string;
    related_receipt_id: string | null;
    suggested_category: string | null;
    ai_confidence: number | null;
  }> = [];

  for (const tx of uncategorized) {
    if (existingTxIds.has(tx.id)) continue;

    // Try to find a receipt that matches this transaction
    const txAmount = Math.abs(Number(tx.amount));
    const txDate = new Date(tx.booking_date);
    const dateFrom = new Date(txDate);
    dateFrom.setDate(dateFrom.getDate() - 3);
    const dateTo = new Date(txDate);
    dateTo.setDate(dateTo.getDate() + 3);

    const { data: matchingReceipts } = await supabase
      .from("receipts")
      .select("id, vendor_name, amount_inc_vat")
      .eq("user_id", userId)
      .gte("receipt_date", dateFrom.toISOString().split("T")[0])
      .lte("receipt_date", dateTo.toISOString().split("T")[0]);

    const match = (matchingReceipts ?? []).find(
      (r) => Math.abs(Number(r.amount_inc_vat) - txAmount) < 0.02
    );

    if (match) {
      // High-confidence match found
      newActions.push({
        user_id: userId,
        type: "match_suggestion",
        title: `Match: ${tx.counterpart_name ?? tx.description ?? "Onbekend"}`,
        description: `Transactie van ${new Date(tx.booking_date).toLocaleDateString("nl-NL")} lijkt te passen bij bon van ${match.vendor_name ?? "onbekend"}.`,
        amount: txAmount,
        related_transaction_id: tx.id,
        related_receipt_id: match.id,
        suggested_category: null,
        ai_confidence: 0.85,
      });
    } else {
      // No match - create an uncategorized action
      newActions.push({
        user_id: userId,
        type: "uncategorized",
        title: tx.counterpart_name ?? tx.description ?? "Onbekende transactie",
        description: `Afschrijving op ${new Date(tx.booking_date).toLocaleDateString("nl-NL")}. Categoriseer of negeer.`,
        amount: txAmount,
        related_transaction_id: tx.id,
        related_receipt_id: null,
        suggested_category: null,
        ai_confidence: null,
      });
    }
  }

  // 4. Insert all new action items at once
  if (newActions.length > 0) {
    const { error: insertError } = await supabase
      .from("action_feed")
      .insert(newActions);
    if (insertError) return { error: insertError.message };
  }

  return { error: null, data: { created: newActions.length } };
}
