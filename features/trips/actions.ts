"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, Trip, TripInput } from "@/lib/types";
import { uuidSchema } from "@/lib/validation";

const KM_TARIEF = 0.23; // €0,23/km (2026)

export interface TripsSummary {
  year: number;
  totalKm: number;
  totalDeduction: number;
  tripCount: number;
  entries: Trip[];
}

export async function getTripsSummary(year: number): Promise<ActionResult<TripsSummary>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", user.id)
    .gte("trip_date", yearStart)
    .lte("trip_date", yearEnd)
    .order("trip_date", { ascending: false });

  if (error) return { error: error.message };

  const entries = (data ?? []) as Trip[];
  let totalKm = 0;

  for (const trip of entries) {
    const km = Number(trip.distance_km);
    totalKm += trip.is_return_trip ? km * 2 : km;
  }

  const round2 = (v: number) => Math.round(v * 100) / 100;

  return {
    error: null,
    data: {
      year,
      totalKm: round2(totalKm),
      totalDeduction: round2(totalKm * KM_TARIEF),
      tripCount: entries.length,
      entries,
    },
  };
}

export async function createTrip(input: TripInput): Promise<ActionResult<Trip>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  if (!input.trip_date || !input.description || !input.distance_km || input.distance_km <= 0) {
    return { error: "Vul datum, omschrijving en afstand in." };
  }

  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: user.id,
      trip_date: input.trip_date,
      description: input.description.trim(),
      origin: input.origin?.trim() || null,
      destination: input.destination?.trim() || null,
      distance_km: input.distance_km,
      is_return_trip: input.is_return_trip ?? false,
      client_id: input.client_id || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data: data as Trip };
}

export async function updateTrip(id: string, input: TripInput): Promise<ActionResult<Trip>> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("trips")
    .update({
      trip_date: input.trip_date,
      description: input.description?.trim() || "",
      origin: input.origin?.trim() || null,
      destination: input.destination?.trim() || null,
      distance_km: input.distance_km,
      is_return_trip: input.is_return_trip ?? false,
      client_id: input.client_id || null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data: data as Trip };
}

export async function deleteTrip(id: string): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig ID." };

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
