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

export async function uploadLogo(formData: FormData): Promise<ActionResult<string>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const file = formData.get("file") as File;
  if (!file) return { error: "Geen bestand geselecteerd." };

  if (file.size > 2 * 1024 * 1024) {
    return { error: "Logo mag maximaal 2MB zijn." };
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Alleen PNG, JPG of SVG bestanden zijn toegestaan." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `logos/${user.id}/logo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(path, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ logo_path: path })
    .eq("id", user.id);

  if (updateError) return { error: updateError.message };

  return { error: null, data: path };
}

export async function deleteLogo(): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data: profile } = await supabase
    .from("profiles")
    .select("logo_path")
    .eq("id", user.id)
    .single();

  if (profile?.logo_path) {
    await supabase.storage.from("receipts").remove([profile.logo_path]);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ logo_path: null })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function getLogoUrl(): Promise<ActionResult<string | null>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data: profile } = await supabase
    .from("profiles")
    .select("logo_path")
    .eq("id", user.id)
    .single();

  if (!profile?.logo_path) return { error: null, data: null };

  const { data } = await supabase.storage
    .from("receipts")
    .createSignedUrl(profile.logo_path, 3600);

  return { error: null, data: data?.signedUrl ?? null };
}
