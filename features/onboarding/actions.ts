"use server";

import { requireAdmin, requireAuth } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sanitizeError } from "@/lib/errors";
import type { ActionResult, OnboardingTask } from "@/lib/types";
import { revalidatePath } from "next/cache";

const DEFAULT_TASKS = [
  { task_key: "profile", title: "Profiel invullen", description: "Naam, KvK-nummer, BTW-nummer, adres en IBAN", sort_order: 1 },
  { task_key: "logo", title: "Logo uploaden", description: "Bedrijfslogo voor op facturen", sort_order: 2 },
  { task_key: "first_client", title: "Eerste klant toevoegen", description: "Voeg je eerste klant toe om facturen te sturen", sort_order: 3 },
  { task_key: "bank", title: "Bankrekening koppelen", description: "Koppel je zakelijke bankrekening", sort_order: 4 },
  { task_key: "first_invoice", title: "Eerste factuur aanmaken", description: "Maak een conceptfactuur aan", sort_order: 5 },
  { task_key: "vat_settings", title: "BTW-instellingen controleren", description: "Controleer je BTW-tarief en -schema", sort_order: 6 },
  { task_key: "first_receipt", title: "Eerste bon uploaden", description: "Upload een zakelijke bon als test", sort_order: 7 },
];

export async function createOnboardingTasks(
  userId: string,
  leadId?: string
): Promise<ActionResult> {
  try {
    const supabase = createServiceClient();

    // Check if tasks already exist
    const { count } = await supabase
      .from("onboarding_tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if ((count || 0) > 0) return { error: null };

    const rows = DEFAULT_TASKS.map((t) => ({
      user_id: userId,
      lead_id: leadId || null,
      ...t,
    }));

    const { error } = await supabase.from("onboarding_tasks").insert(rows);
    if (error) return { error: sanitizeError(error, { action: "createOnboardingTasks" }) };

    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "createOnboardingTasks" }) };
  }
}

export async function getOnboardingProgress(
  userId?: string
): Promise<ActionResult<{ tasks: OnboardingTask[]; completedCount: number; totalCount: number }>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };

  const targetUserId = userId || auth.user.id;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("onboarding_tasks")
      .select("*")
      .eq("user_id", targetUserId)
      .order("sort_order", { ascending: true });

    if (error) return { error: sanitizeError(error, { action: "getOnboardingProgress" }) };

    const tasks = (data || []) as OnboardingTask[];
    const completedCount = tasks.filter((t) => t.completed).length;

    return { error: null, data: { tasks, completedCount, totalCount: tasks.length } };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getOnboardingProgress" }) };
  }
}

export async function completeOnboardingTask(taskId: string): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };

  try {
    const { supabase, user } = auth;
    const { error } = await supabase
      .from("onboarding_tasks")
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        completed_by: user.id,
      })
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) return { error: sanitizeError(error, { action: "completeOnboardingTask" }) };

    revalidatePath("/dashboard/onboarding");
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "completeOnboardingTask" }) };
  }
}

export interface OnboardingOverviewItem {
  userId: string;
  fullName: string | null;
  studioName: string | null;
  email: string;
  completedTasks: number;
  totalTasks: number;
  createdAt: string;
}

export async function getOnboardingOverview(): Promise<
  ActionResult<OnboardingOverviewItem[]>
> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("onboarding_tasks")
      .select("user_id, completed, created_at");

    if (error) return { error: sanitizeError(error, { action: "getOnboardingOverview" }) };

    // Group by user
    const userMap = new Map<string, { total: number; done: number; createdAt: string }>();
    for (const row of data || []) {
      const existing = userMap.get(row.user_id) || { total: 0, done: 0, createdAt: row.created_at };
      existing.total++;
      if (row.completed) existing.done++;
      userMap.set(row.user_id, existing);
    }

    // Filter to incomplete only
    const incompleteUserIds = [...userMap.entries()]
      .filter(([, v]) => v.done < v.total)
      .map(([id]) => id);

    if (incompleteUserIds.length === 0) return { error: null, data: [] };

    // Fetch profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, studio_name")
      .in("id", incompleteUserIds);

    // Fetch emails
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map<string, string>();
    for (const u of authData?.users ?? []) {
      emailMap.set(u.id, u.email ?? "");
    }

    const result: OnboardingOverviewItem[] = incompleteUserIds.map((uid) => {
      const stats = userMap.get(uid)!;
      const profile = (profiles ?? []).find((p) => p.id === uid);
      return {
        userId: uid,
        fullName: profile?.full_name ?? null,
        studioName: profile?.studio_name ?? null,
        email: emailMap.get(uid) ?? "",
        completedTasks: stats.done,
        totalTasks: stats.total,
        createdAt: stats.createdAt,
      };
    });

    return { error: null, data: result };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getOnboardingOverview" }) };
  }
}
