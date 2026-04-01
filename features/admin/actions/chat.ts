"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult, ChatMessage } from "@/lib/types";
import { sanitizeError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import type { PageKpis } from "./stats";


// ─── Chat / Feedback ───

export interface ChatConversationWithUser {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string;
  last_message: string | null;
  last_sender: "user" | "admin" | null;
  message_count: number;
  updated_at: string;
  created_at: string;
}

export async function getChatConversations(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{ entries: ChatConversationWithUser[]; total: number }>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: conversations, count, error } = await supabase
      .from("chat_conversations")
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (error) return { error: error.message };
    if (!conversations || conversations.length === 0) {
      return { error: null, data: { entries: [], total: 0 } };
    }

    const userIds = conversations.map((c) => c.user_id);

    // Get profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const profileMap = new Map<string, string | null>();
    for (const p of profiles ?? []) {
      profileMap.set(p.id, p.full_name);
    }

    // Get auth emails
    const { data: authData } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });

    const emailMap = new Map<string, string>();
    for (const u of authData?.users ?? []) {
      emailMap.set(u.id, u.email ?? "");
    }

    // Get last message per conversation
    const conversationIds = conversations.map((c) => c.id);
    const { data: allMessages } = await supabase
      .from("chat_messages")
      .select("conversation_id, message, sender, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    const lastMessageMap = new Map<string, { message: string; sender: "user" | "admin" }>();
    const messageCountMap = new Map<string, number>();
    for (const msg of allMessages ?? []) {
      if (!lastMessageMap.has(msg.conversation_id)) {
        lastMessageMap.set(msg.conversation_id, { message: msg.message, sender: msg.sender as "user" | "admin" });
      }
      messageCountMap.set(msg.conversation_id, (messageCountMap.get(msg.conversation_id) ?? 0) + 1);
    }

    // Filter by search (on name/email)
    let entries: ChatConversationWithUser[] = conversations.map((c) => {
      const last = lastMessageMap.get(c.id);
      return {
        id: c.id,
        user_id: c.user_id,
        user_name: profileMap.get(c.user_id) ?? null,
        user_email: emailMap.get(c.user_id) ?? "",
        last_message: last?.message ?? null,
        last_sender: last?.sender ?? null,
        message_count: messageCountMap.get(c.id) ?? 0,
        updated_at: c.updated_at,
        created_at: c.created_at,
      };
    });

    if (filters?.search?.trim()) {
      const term = filters.search.trim().toLowerCase();
      entries = entries.filter(
        (e) =>
          (e.user_name?.toLowerCase().includes(term)) ||
          e.user_email.toLowerCase().includes(term)
      );
    }

    return { error: null, data: { entries, total: count ?? entries.length } };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getChatConversations" }) };
  }
}

export async function getChatConversationMessages(
  conversationId: string
): Promise<ActionResult<ChatMessage[]>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) return { error: error.message };
    return { error: null, data: data ?? [] };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getChatConversationMessages" }) };
  }
}

export async function sendAdminChatMessage(
  conversationId: string,
  message: string
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  if (!message?.trim()) return { error: "Bericht is verplicht." };

  try {
    const supabase = createServiceClient();

    const { error: msgError } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversationId,
        sender: "admin",
        message: message.trim(),
      });

    if (msgError) return { error: msgError.message };

    // Update conversation timestamp
    await supabase
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    revalidatePath("/admin/feedback");
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "sendAdminChatMessage" }) };
  }
}

export async function getChatKpis(): Promise<ActionResult<PageKpis>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: total },
      { count: thisWeek },
    ] = await Promise.all([
      supabase.from("chat_conversations").select("*", { count: "exact", head: true }),
      supabase.from("chat_conversations").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    ]);

    // Count "unanswered" conversations (last message is from user)
    const { data: allConversations } = await supabase
      .from("chat_conversations")
      .select("id");

    let unanswered = 0;
    if (allConversations && allConversations.length > 0) {
      const ids = allConversations.map((c) => c.id);
      const { data: lastMessages } = await supabase
        .from("chat_messages")
        .select("conversation_id, sender, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false });

      const seen = new Set<string>();
      for (const msg of lastMessages ?? []) {
        if (!seen.has(msg.conversation_id)) {
          seen.add(msg.conversation_id);
          if (msg.sender === "user") unanswered++;
        }
      }
    }

    return {
      error: null,
      data: {
        items: [
          { label: "Totaal gesprekken", value: total ?? 0 },
          { label: "Onbeantwoord", value: unanswered },
          { label: "Deze week", value: thisWeek ?? 0 },
        ],
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getChatKpis" }) };
  }
}
