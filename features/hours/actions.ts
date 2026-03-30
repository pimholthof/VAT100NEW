"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, HoursLogEntry, HoursLogInput } from "@/lib/types";
import { uuidSchema } from "@/lib/validation";

const URENCRITERIUM = 1225; // Minimaal 1.225 uur/jaar

export interface HoursSummary {
  year: number;
  totalHours: number;
  target: number;
  remaining: number;
  onTrack: boolean;
  weeklyAverage: number;
  entries: HoursLogEntry[];
}

export async function getHoursSummary(year: number): Promise<ActionResult<HoursSummary>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const { data, error } = await supabase
    .from("hours_log")
    .select("*")
    .eq("user_id", user.id)
    .gte("work_date", yearStart)
    .lte("work_date", yearEnd)
    .order("work_date", { ascending: false });

  if (error) return { error: error.message };

  const entries = (data ?? []) as HoursLogEntry[];
  const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);
  const remaining = Math.max(0, URENCRITERIUM - totalHours);

  // Calculate weeks elapsed this year
  const now = new Date();
  const yearStartDate = new Date(year, 0, 1);
  const endDate = now.getFullYear() === year ? now : new Date(year, 11, 31);
  const weeksElapsed = Math.max(1, Math.ceil((endDate.getTime() - yearStartDate.getTime()) / (7 * 24 * 3600 * 1000)));
  const weeklyAverage = Math.round((totalHours / weeksElapsed) * 10) / 10;

  // On track if projected hours (weekly avg * 52) >= 1225
  const onTrack = weeklyAverage * 52 >= URENCRITERIUM;

  return {
    error: null,
    data: {
      year,
      totalHours: Math.round(totalHours * 100) / 100,
      target: URENCRITERIUM,
      remaining: Math.round(remaining * 100) / 100,
      onTrack,
      weeklyAverage,
      entries,
    },
  };
}

export async function createHoursEntry(input: HoursLogInput): Promise<ActionResult<HoursLogEntry>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  if (!input.work_date || !input.hours || input.hours <= 0) {
    return { error: "Vul een geldige datum en aantal uren in." };
  }

  const { data, error } = await supabase
    .from("hours_log")
    .insert({
      user_id: user.id,
      work_date: input.work_date,
      hours: input.hours,
      description: input.description?.trim() || null,
      project: input.project?.trim() || null,
      client_id: input.client_id || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data: data as HoursLogEntry };
}

export async function updateHoursEntry(id: string, input: HoursLogInput): Promise<ActionResult<HoursLogEntry>> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("hours_log")
    .update({
      work_date: input.work_date,
      hours: input.hours,
      description: input.description?.trim() || null,
      project: input.project?.trim() || null,
      client_id: input.client_id || null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data: data as HoursLogEntry };
}

export async function deleteHoursEntry(id: string): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig ID." };

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
