"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, ChatConversation, ChatMessage } from "@/lib/types";

export async function getOrCreateConversation(): Promise<ActionResult<ChatConversation>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Try to find existing conversation
  const { data: existing } = await supabase
    .from("chat_conversations")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (existing) return { error: null, data: existing };

  // Create new conversation
  const { data, error } = await supabase
    .from("chat_conversations")
    .insert({ user_id: user.id })
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data: data };
}

export async function getChatMessages(): Promise<ActionResult<ChatMessage[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Get conversation for this user
  const { data: conversation } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!conversation) return { error: null, data: [] };

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  if (error) return { error: error.message };
  return { error: null, data: data ?? [] };
}

export async function sendChatMessage(message: string): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  if (!message?.trim()) return { error: "Bericht is verplicht." };

  // Get or create conversation
  let conversationId: string;

  const { data: existing } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    conversationId = existing.id;
  } else {
    const { data: created, error: createError } = await supabase
      .from("chat_conversations")
      .insert({ user_id: user.id })
      .select("id")
      .single();

    if (createError || !created) return { error: createError?.message ?? "Kon gesprek niet aanmaken." };
    conversationId = created.id;
  }

  // Insert message
  const { error: msgError } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      sender: "user",
      message: message.trim(),
    });

  if (msgError) return { error: msgError.message };

  // Update conversation timestamp
  await supabase
    .from("chat_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return { error: null };
}
