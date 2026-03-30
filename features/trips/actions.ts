"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, Trip, TripInput } from "@/lib/types";

/** Kilometervergoeding 2026: €0,23/km */
const KM_VERGOEDING = 0.23;

export async function getTrips(filters?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<ActionResult<Trip[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  let query = supabase
    .from("trips")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (filters?.dateFrom) query = query.gte("date", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("date", filters.dateTo);

  const { data, error } = await query.limit(500);
  if (error) return { error: error.message };
  return { error: null, data: (data ?? []) as Trip[] };
}

export async function createTrip(
  input: TripInput,
): Promise<ActionResult<Trip>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  if (!input.distance_km || input.distance_km <= 0) {
    return { error: "Afstand moet positief zijn." };
  }

  // If return trip, double the distance
  const effectiveDistance = input.is_return_trip ? input.distance_km * 2 : input.distance_km;

  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: user.id,
      date: input.date,
      distance_km: effectiveDistance,
      is_return_trip: input.is_return_trip ?? false,
      purpose: input.purpose?.trim() || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data: data as Trip };
}

export async function updateTrip(
  id: string,
  input: TripInput,
): Promise<ActionResult<Trip>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const effectiveDistance = input.is_return_trip ? input.distance_km * 2 : input.distance_km;

  const { data, error } = await supabase
    .from("trips")
    .update({
      date: input.date,
      distance_km: effectiveDistance,
      is_return_trip: input.is_return_trip ?? false,
      purpose: input.purpose?.trim() || null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data: data as Trip };
}

export async function deleteTrip(id: string): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("trips")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Get year-to-date km totals and calculated deduction.
 */
export async function getYearTripSummary(
  year?: number,
): Promise<ActionResult<{ totalKm: number; deduction: number; kmRate: number }>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const targetYear = year ?? new Date().getFullYear();
  const yearStart = `${targetYear}-01-01`;
  const yearEnd = `${targetYear}-12-31`;

  const { data, error } = await supabase
    .from("trips")
    .select("distance_km")
    .eq("user_id", user.id)
    .gte("date", yearStart)
    .lte("date", yearEnd);

  if (error) return { error: error.message };

  const totalKm = (data ?? []).reduce(
    (sum, t) => sum + (Number(t.distance_km) || 0), 0
  );

  const round2 = (v: number) => Math.round(v * 100) / 100;

  return {
    error: null,
    data: {
      totalKm: round2(totalKm),
      deduction: round2(totalKm * KM_VERGOEDING),
      kmRate: KM_VERGOEDING,
    },
  };
}
