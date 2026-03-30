"use server";

import { requireAuth, requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";
import { uuidSchema } from "@/lib/validation";

// ─── Types ───

export interface CoachMessage {
  id: string;
  user_id: string;
  sender_name: string;
  subject: string | null;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface CoachSuggestion {
  id: string;
  user_id: string;
  suggestion_type: string;
  title: string;
  context: string;
  is_acted_on: boolean;
  created_at: string;
  // Joined from profiles
  user_name?: string;
}

// ─── User-facing: messages ───

export async function getCoachMessages(): Promise<ActionResult<CoachMessage[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("coach_messages")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { error: null, data: (data ?? []) as CoachMessage[] };
}

export async function markMessageRead(
  messageId: string,
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(messageId).success) return { error: "Ongeldig bericht-ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("coach_messages")
    .update({ is_read: true })
    .eq("id", messageId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function getUnreadCount(): Promise<ActionResult<number>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { count, error } = await supabase
    .from("coach_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) return { error: error.message };
  return { error: null, data: count ?? 0 };
}

// ─── Admin: send messages ───

export async function sendCoachMessage(
  userId: string,
  subject: string,
  body: string,
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(userId).success) return { error: "Ongeldig gebruiker-ID." };
  if (!body.trim()) return { error: "Bericht mag niet leeg zijn." };

  const admin = await requireAdmin();
  if (admin.error) return { error: admin.error };
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("coach_messages")
    .insert({
      user_id: userId,
      sender_name: "Pim",
      subject: subject.trim() || null,
      body: body.trim(),
    });

  if (error) return { error: error.message };
  return { error: null };
}

export async function getCoachMessagesForUser(
  userId: string,
): Promise<ActionResult<CoachMessage[]>> {
  if (!uuidSchema.safeParse(userId).success) return { error: "Ongeldig gebruiker-ID." };

  const admin = await requireAdmin();
  if (admin.error) return { error: admin.error };
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("coach_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { error: null, data: (data ?? []) as CoachMessage[] };
}

// ─── Admin: suggestions ───

export async function getCoachSuggestions(): Promise<ActionResult<CoachSuggestion[]>> {
  const admin = await requireAdmin();
  if (admin.error) return { error: admin.error };
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("coach_suggestions")
    .select("*, profiles(full_name)")
    .eq("is_acted_on", false)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { error: error.message };

  const suggestions: CoachSuggestion[] = (data ?? []).map((s: Record<string, unknown>) => ({
    ...(s as unknown as CoachSuggestion),
    user_name: (s.profiles as { full_name?: string } | null)?.full_name ?? undefined,
  }));

  return { error: null, data: suggestions };
}

export async function dismissSuggestion(
  suggestionId: string,
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(suggestionId).success) return { error: "Ongeldig suggestie-ID." };

  const admin = await requireAdmin();
  if (admin.error) return { error: admin.error };
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("coach_suggestions")
    .update({ is_acted_on: true })
    .eq("id", suggestionId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function generateCoachSuggestions(): Promise<ActionResult<number>> {
  const admin = await requireAdmin();
  if (admin.error) return { error: admin.error };
  const supabase = createServiceClient();

  let created = 0;

  // 1. Users with uncategorized receipts (>5)
  const { data: receiptUsers } = await supabase.rpc("get_users_with_uncategorized_receipts" as never);
  // Fallback: query directly if RPC doesn't exist
  if (!receiptUsers) {
    const { data: users } = await supabase
      .from("profiles")
      .select("id, full_name");

    for (const user of users ?? []) {
      const { count } = await supabase
        .from("receipts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("cost_code", null)
        .not("receipt_date", "is", null);

      if ((count ?? 0) >= 5) {
        // Check if suggestion already exists
        const { count: existing } = await supabase
          .from("coach_suggestions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("suggestion_type", "uncategorized_items")
          .eq("is_acted_on", false);

        if ((existing ?? 0) === 0) {
          await supabase.from("coach_suggestions").insert({
            user_id: user.id,
            suggestion_type: "uncategorized_items",
            title: `${user.full_name} heeft ${count} ongecategoriseerde bonnen`,
            context: `${count} bonnen zonder kostensoort. Een persoonlijk bericht kan helpen.`,
          });
          created++;
        }
      }
    }
  }

  // 2. Users with bank errors
  const { data: errorConnections } = await supabase
    .from("bank_connections")
    .select("user_id, institution_name, error_message, profiles(full_name)")
    .eq("status", "error");

  for (const conn of errorConnections ?? []) {
    const { count: existing } = await supabase
      .from("coach_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", conn.user_id)
      .eq("suggestion_type", "bank_error")
      .eq("is_acted_on", false);

    if ((existing ?? 0) === 0) {
      const userName = (conn.profiles as { full_name?: string } | null)?.full_name ?? "Gebruiker";
      await supabase.from("coach_suggestions").insert({
        user_id: conn.user_id,
        suggestion_type: "bank_error",
        title: `${userName}: bankkoppeling ${conn.institution_name} heeft een fout`,
        context: conn.error_message ?? "Onbekende fout bij banksynchronisatie.",
      });
      created++;
    }
  }

  return { error: null, data: created };
}
