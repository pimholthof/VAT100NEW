"use server";

import { requireAuth } from "@/lib/supabase/server";
import type {
  ActionResult,
  AdvisorClient,
  AdvisorClientWithProfile,
  Profile,
} from "@/lib/types";

async function requireAdvisor() {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error, supabase: null, user: null } as const;
  const { supabase, user } = auth;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "advisor") {
    return { error: "Geen toegang. Je bent geen advisor.", supabase: null, user: null } as const;
  }

  return { error: null, supabase, user } as const;
}

export { requireAdvisor };

// ─── Advisor: Get my clients ───

export async function getAdvisorClients(): Promise<ActionResult<AdvisorClientWithProfile[]>> {
  const auth = await requireAdvisor();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("advisor_clients")
    .select(`
      id,
      advisor_id,
      client_user_id,
      status,
      created_at,
      profile:profiles!advisor_clients_client_user_id_fkey(full_name, studio_name)
    `)
    .eq("advisor_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  interface JoinRow {
    id: string;
    advisor_id: string;
    client_user_id: string;
    status: string;
    created_at: string;
    profile: { full_name: string; studio_name: string | null } | { full_name: string; studio_name: string | null }[];
  }

  const mapped = ((data ?? []) as unknown as JoinRow[]).map((row) => {
    const profileData = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    return {
      id: row.id,
      advisor_id: row.advisor_id,
      client_user_id: row.client_user_id,
      status: row.status as AdvisorClient["status"],
      created_at: row.created_at,
      profile: (profileData ?? { full_name: "—", studio_name: null }) as Pick<Profile, "full_name" | "studio_name">,
    };
  });

  return { error: null, data: mapped };
}

// ─── Advisor: Link a client by user_id ───

export async function linkClient(clientUserId: string): Promise<ActionResult<AdvisorClient>> {
  const auth = await requireAdvisor();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  if (clientUserId === user.id) {
    return { error: "Je kunt jezelf niet als klant koppelen." };
  }

  const { data, error } = await supabase
    .from("advisor_clients")
    .insert({
      advisor_id: user.id,
      client_user_id: clientUserId,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Deze klant is al gekoppeld." };
    return { error: error.message };
  }

  return { error: null, data: data as AdvisorClient };
}

// ─── User: Accept advisor link ───

export async function acceptAdvisor(advisorClientId: string): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("advisor_clients")
    .update({ status: "active" })
    .eq("id", advisorClientId)
    .eq("client_user_id", user.id)
    .eq("status", "pending");

  if (error) return { error: error.message };
  return { error: null };
}

// ─── User: Get my advisor ───

export async function getMyAdvisor(): Promise<ActionResult<AdvisorClient | null>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("advisor_clients")
    .select("*")
    .eq("client_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error) return { error: error.message };
  return { error: null, data: data as AdvisorClient | null };
}

// ─── Advisor: Remove client ───

export async function removeClient(advisorClientId: string): Promise<ActionResult> {
  const auth = await requireAdvisor();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("advisor_clients")
    .update({ status: "revoked" })
    .eq("id", advisorClientId)
    .eq("advisor_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

// ─── Check if user has active advisor ───

export async function hasActiveAdvisor(userId: string): Promise<boolean> {
  const auth = await requireAuth();
  if (auth.error !== null) return false;
  const { supabase } = auth;

  const { data } = await supabase
    .from("advisor_clients")
    .select("id")
    .eq("client_user_id", userId)
    .eq("status", "active")
    .limit(1);

  return (data ?? []).length > 0;
}

// ─── Check if current user is advisor for given client ───

export async function isAdvisorFor(clientUserId: string): Promise<boolean> {
  const auth = await requireAuth();
  if (auth.error !== null) return false;
  const { supabase, user } = auth;

  const { data } = await supabase
    .from("advisor_clients")
    .select("id")
    .eq("advisor_id", user.id)
    .eq("client_user_id", clientUserId)
    .eq("status", "active")
    .limit(1);

  return (data ?? []).length > 0;
}

// ─── Get user role ───

export async function getUserRole(): Promise<ActionResult<"user" | "advisor">> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { error: null, data: (data?.role as "user" | "advisor") ?? "user" };
}
