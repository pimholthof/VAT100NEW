"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { uuidSchema } from "@/lib/validation";

// ─── Types ───

export type InboxItemType = "unmatched_transaction" | "uncategorized_receipt" | "pending_action";

export interface InboxItem {
  id: string;
  itemType: InboxItemType;
  title: string;
  description: string | null;
  amount: number | null;
  date: string;
  category: string | null;
  cost_code: number | null;
}

export interface InboxStats {
  unmatchedTransactions: number;
  uncategorizedReceipts: number;
  pendingActions: number;
  total: number;
}

// ─── Inbox items ───

export async function getInboxItems(filter?: InboxItemType): Promise<ActionResult<InboxItem[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const items: InboxItem[] = [];

  // 1. Unmatched outgoing bank transactions (no category)
  if (!filter || filter === "unmatched_transaction") {
    const { data: transactions } = await supabase
      .from("bank_transactions")
      .select("id, booking_date, amount, description, counterpart_name, category")
      .eq("user_id", user.id)
      .is("category", null)
      .order("booking_date", { ascending: false })
      .limit(100);

    for (const tx of transactions ?? []) {
      items.push({
        id: tx.id,
        itemType: "unmatched_transaction",
        title: tx.counterpart_name || tx.description || "Onbekende transactie",
        description: tx.description,
        amount: tx.amount,
        date: tx.booking_date,
        category: tx.category,
        cost_code: null,
      });
    }
  }

  // 2. Receipts without cost_code
  if (!filter || filter === "uncategorized_receipt") {
    const { data: receipts } = await supabase
      .from("receipts")
      .select("id, vendor_name, amount_inc_vat, receipt_date, category, cost_code")
      .eq("user_id", user.id)
      .is("cost_code", null)
      .not("receipt_date", "is", null)
      .order("receipt_date", { ascending: false })
      .limit(100);

    for (const r of receipts ?? []) {
      items.push({
        id: r.id,
        itemType: "uncategorized_receipt",
        title: r.vendor_name || "Onbekende leverancier",
        description: r.category,
        amount: r.amount_inc_vat,
        date: r.receipt_date!,
        category: r.category,
        cost_code: r.cost_code,
      });
    }
  }

  // 3. Pending action feed items
  if (!filter || filter === "pending_action") {
    const { data: actions } = await supabase
      .from("action_feed")
      .select("id, title, description, amount, created_at, suggested_category")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50);

    for (const a of actions ?? []) {
      items.push({
        id: a.id,
        itemType: "pending_action",
        title: a.title,
        description: a.description,
        amount: a.amount,
        date: a.created_at,
        category: a.suggested_category,
        cost_code: null,
      });
    }
  }

  // Sort by date descending
  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { error: null, data: items };
}

// ─── Stats ───

export async function getInboxStats(): Promise<ActionResult<InboxStats>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const [txResult, receiptResult, actionResult] = await Promise.all([
    supabase
      .from("bank_transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("category", null),
    supabase
      .from("receipts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("cost_code", null)
      .not("receipt_date", "is", null),
    supabase
      .from("action_feed")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending"),
  ]);

  const unmatchedTransactions = txResult.count ?? 0;
  const uncategorizedReceipts = receiptResult.count ?? 0;
  const pendingActions = actionResult.count ?? 0;

  return {
    error: null,
    data: {
      unmatchedTransactions,
      uncategorizedReceipts,
      pendingActions,
      total: unmatchedTransactions + uncategorizedReceipts + pendingActions,
    },
  };
}

// ─── Actions ───

export async function assignCostCode(
  receiptId: string,
  costCode: number,
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(receiptId).success) return { error: "Ongeldig bon-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("receipts")
    .update({ cost_code: costCode })
    .eq("id", receiptId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function categorizeInboxTransaction(
  transactionId: string,
  category: string,
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(transactionId).success) return { error: "Ongeldig transactie-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const isIncome = category === "Omzet";

  const { error } = await supabase
    .from("bank_transactions")
    .update({ category, is_income: isIncome })
    .eq("id", transactionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function resolveInboxAction(
  actionId: string,
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(actionId).success) return { error: "Ongeldig actie-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("action_feed")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", actionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function ignoreInboxAction(
  actionId: string,
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(actionId).success) return { error: "Ongeldig actie-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("action_feed")
    .update({ status: "ignored" })
    .eq("id", actionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}
