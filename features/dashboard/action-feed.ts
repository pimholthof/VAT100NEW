"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, ActionFeedItem } from "@/lib/types";
import { uuidSchema } from "@/lib/validation";
import { sendReminder } from "@/features/invoices/actions";

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
 * Resolve an action item (confirm match, send reminder, etc.)
 */
export async function resolveActionItem(
  itemId: string,
  category?: string,
  draftContent?: string
): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(itemId);
  if (!idCheck.success) return { error: "Ongeldig actie-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // 1. Get the item to perform the specific action (filter by user_id for security)
  const { data: item } = await supabase
    .from("action_feed")
    .select("*")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .single();

  if (!item) return { error: "Actie niet gevonden." };

  // 2. Perform type-specific action
  if (item.type === "reminder_suggestion" && item.related_invoice_id) {
    const res = await sendReminder(item.related_invoice_id, draftContent || item.draft_content);
    if (res.error) return { error: res.error };
  }

  // Payment match: mark invoice as paid and link transaction
  if (item.type === "match_suggestion" && item.related_invoice_id && item.related_transaction_id) {
    await supabase
      .from("invoices")
      .update({ status: "paid" })
      .eq("id", item.related_invoice_id)
      .eq("user_id", user.id);

    await supabase
      .from("bank_transactions")
      .update({ linked_invoice_id: item.related_invoice_id })
      .eq("id", item.related_transaction_id)
      .eq("user_id", user.id);
  }

  const { error } = await supabase
    .from("action_feed")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("user_id", user.id);

  // If a category was provided and there's a related transaction, categorize it
  if (!error && category && item.related_transaction_id) {
    await supabase
      .from("bank_transactions")
      .update({ category })
      .eq("id", item.related_transaction_id)
      .eq("user_id", user.id);

    // Reserve herberekening na classificatie (fire-and-forget)
    import("@/lib/services/reserve-recalculator").then((m) =>
      m.recalculateReserves(user.id, "classification", item.related_transaction_id).catch(() => {})
    );
  }

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Ignore an action item (user decided this is irrelevant).
 */
export async function ignoreActionItem(itemId: string): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(itemId);
  if (!idCheck.success) return { error: "Ongeldig actie-ID." };

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
