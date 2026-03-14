"use server";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult, Profile } from "@/lib/types";
import { profileSchema, validate } from "@/lib/validation";

export async function getProfile(): Promise<ActionResult<Profile>> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

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
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const v = validate(profileSchema, input);
  if (v.error) return { error: v.error };

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name?.trim() || null,
      studio_name: input.studio_name?.trim() || null,
      kvk_number: input.kvk_number?.trim() || null,
      btw_number: input.btw_number?.trim() || null,
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      postal_code: input.postal_code?.trim() || null,
      iban: input.iban?.trim() || null,
      bic: input.bic?.trim() || null,
    })
    .eq("id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data };
}
