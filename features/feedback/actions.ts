"use server";

import { requireAdmin, requireAuth } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sanitizeError } from "@/lib/errors";
import type { ActionResult, Feedback, FeedbackType, FeedbackStatus } from "@/lib/types";

export async function submitFeedback(input: {
  type: FeedbackType;
  message: string;
  score?: number;
  pageUrl?: string;
}): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };

  try {
    const { supabase, user } = auth;
    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      type: input.type,
      message: input.message,
      score: input.score ?? null,
      page_url: input.pageUrl ?? null,
    });

    if (error) return { error: sanitizeError(error, { action: "submitFeedback" }) };
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "submitFeedback" }) };
  }
}

export async function getAdminFeedback(filters?: {
  type?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{ entries: (Feedback & { full_name?: string })[]; total: number }>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 25;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("feedback")
      .select("*, profile:profiles(full_name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters?.type && filters.type !== "all") {
      query = query.eq("type", filters.type);
    }
    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    const { data, count, error } = await query;
    if (error) return { error: sanitizeError(error, { action: "getAdminFeedback" }) };

    const entries = (data ?? []).map((row) => ({
      ...row,
      full_name: (row.profile as { full_name: string } | null)?.full_name ?? undefined,
    })) as (Feedback & { full_name?: string })[];

    return { error: null, data: { entries, total: count ?? 0 } };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getAdminFeedback" }) };
  }
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus,
  adminNotes?: string
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const updates: Record<string, unknown> = { status };
    if (adminNotes !== undefined) updates.admin_notes = adminNotes;
    if (status === "resolved" || status === "wont_fix") {
      updates.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("feedback")
      .update(updates)
      .eq("id", feedbackId);

    if (error) return { error: sanitizeError(error, { action: "updateFeedbackStatus" }) };
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "updateFeedbackStatus" }) };
  }
}

export async function getNPSStats(): Promise<
  ActionResult<{ nps: number; totalResponses: number; promoters: number; passives: number; detractors: number }>
> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data, error } = await supabase
      .from("feedback")
      .select("score")
      .eq("type", "nps")
      .not("score", "is", null)
      .gte("created_at", ninetyDaysAgo.toISOString());

    if (error) return { error: sanitizeError(error, { action: "getNPSStats" }) };

    const scores = (data ?? []).map((r) => r.score as number);
    const total = scores.length;
    const promoters = scores.filter((s) => s >= 9).length;
    const passives = scores.filter((s) => s >= 7 && s <= 8).length;
    const detractors = scores.filter((s) => s <= 6).length;
    const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

    return { error: null, data: { nps, totalResponses: total, promoters, passives, detractors } };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getNPSStats" }) };
  }
}
