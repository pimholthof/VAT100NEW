"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, HoursLog, HoursLogInput } from "@/lib/types";

export async function getHoursLog(filters?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<ActionResult<HoursLog[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  let query = supabase
    .from("hours_log")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (filters?.dateFrom) query = query.gte("date", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("date", filters.dateTo);

  const { data, error } = await query.limit(500);
  if (error) return { error: error.message };
  return { error: null, data: (data ?? []) as HoursLog[] };
}

export async function createHoursEntry(
  input: HoursLogInput,
): Promise<ActionResult<HoursLog>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  if (!input.hours || input.hours <= 0 || input.hours > 24) {
    return { error: "Uren moeten tussen 0 en 24 liggen." };
  }

  const { data, error } = await supabase
    .from("hours_log")
    .insert({
      user_id: user.id,
      date: input.date,
      hours: input.hours,
      category: input.category?.trim() || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data: data as HoursLog };
}

export async function updateHoursEntry(
  id: string,
  input: HoursLogInput,
): Promise<ActionResult<HoursLog>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("hours_log")
    .update({
      date: input.date,
      hours: input.hours,
      category: input.category?.trim() || null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data: data as HoursLog };
}

export async function deleteHoursEntry(id: string): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("hours_log")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Get year-to-date total hours (for urencriterium check: >= 1225 hours/year).
 */
export async function getYearTotalHours(
  year?: number,
): Promise<ActionResult<{ total: number; meetsUrencriterium: boolean }>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const targetYear = year ?? new Date().getFullYear();
  const yearStart = `${targetYear}-01-01`;
  const yearEnd = `${targetYear}-12-31`;

  const { data, error } = await supabase
    .from("hours_log")
    .select("hours")
    .eq("user_id", user.id)
    .gte("date", yearStart)
    .lte("date", yearEnd);

  if (error) return { error: error.message };

  const total = (data ?? []).reduce((sum, h) => sum + (Number(h.hours) || 0), 0);

  return {
    error: null,
    data: {
      total: Math.round(total * 100) / 100,
      meetsUrencriterium: total >= 1225,
    },
  };
}
