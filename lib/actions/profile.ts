"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, Profile } from "@/lib/types";
import { profileSchema, validate } from "@/lib/validation";

export async function getProfile(): Promise<ActionResult<Profile>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) return { error: error.message };
  if (!data) return { error: "Profiel niet gevonden." };
  return { error: null, data };
}

export async function updateProfile(
  input: Partial<Profile>
): Promise<ActionResult<Profile>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const v = validate(profileSchema, input);
  if (v.error) return { error: v.error };

  const updateData: Record<string, unknown> = {
    full_name: input.full_name?.trim() || null,
    studio_name: input.studio_name?.trim() || null,
    kvk_number: input.kvk_number?.trim() || null,
    btw_number: input.btw_number?.trim() || null,
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    postal_code: input.postal_code?.trim() || null,
    iban: input.iban?.trim() || null,
    bic: input.bic?.trim() || null,
  };

  if (input.expected_annual_revenue !== undefined) {
    updateData.expected_annual_revenue = input.expected_annual_revenue;
  }
  if (input.zelfstandigenaftrek !== undefined) {
    updateData.zelfstandigenaftrek = input.zelfstandigenaftrek;
  }
  if (input.monthly_fixed_costs !== undefined) {
    updateData.monthly_fixed_costs = input.monthly_fixed_costs;
  }
  if (input.btw_period !== undefined) {
    updateData.btw_period = input.btw_period;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data };
}
