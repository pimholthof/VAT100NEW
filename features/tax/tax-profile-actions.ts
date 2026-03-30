"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, PersonalTaxProfile, PersonalTaxProfileInput } from "@/lib/types";

export async function getPersonalTaxProfile(
  year?: number,
): Promise<ActionResult<PersonalTaxProfile | null>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const targetYear = year ?? new Date().getFullYear();

  const { data, error } = await supabase
    .from("personal_tax_profiles")
    .select("*")
    .eq("user_id", user.id)
    .eq("year", targetYear)
    .maybeSingle();

  if (error) return { error: error.message };
  return { error: null, data: data as PersonalTaxProfile | null };
}

export async function updatePersonalTaxProfile(
  year: number,
  input: PersonalTaxProfileInput,
): Promise<ActionResult<PersonalTaxProfile>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  if (!Number.isInteger(year) || year < 2020 || year > 2030) {
    return { error: "Ongeldig jaar." };
  }

  const { data, error } = await supabase
    .from("personal_tax_profiles")
    .upsert(
      {
        user_id: user.id,
        year,
        ...input,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,year" }
    )
    .select("*")
    .single();

  if (error) return { error: error.message };
  return { error: null, data: data as PersonalTaxProfile };
}
