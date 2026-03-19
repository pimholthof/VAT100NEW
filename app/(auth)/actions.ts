"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface AuthResult {
  error: string | null;
}

const loginSchema = z.object({
  email: z.string().trim().email("Ongeldig e-mailadres"),
  password: z.string().min(6, "Wachtwoord moet minimaal 6 tekens zijn"),
});

const registerSchema = z.object({
  email: z.string().trim().email("Ongeldig e-mailadres"),
  password: z.string().min(6, "Wachtwoord moet minimaal 6 tekens zijn"),
  full_name: z.string().trim().min(1, "Naam is verplicht"),
  studio_name: z.string().trim().optional().default(""),
});

const onboardingSchema = z.object({
  full_name: z.string().trim().optional().default(""),
  studio_name: z.string().trim().optional().default(""),
  kvk_number: z.string().trim().optional().default(""),
  btw_number: z.string().trim().optional().default(""),
  iban: z.string().trim().optional().default(""),
  bic: z.string().trim().optional().default(""),
  address: z.string().trim().optional().default(""),
  city: z.string().trim().optional().default(""),
  postal_code: z.string().trim().optional().default(""),
});

export async function login(formData: FormData): Promise<AuthResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validatiefout" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function register(formData: FormData): Promise<AuthResult> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("full_name"),
    studio_name: formData.get("studio_name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validatiefout" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.full_name,
        studio_name: parsed.data.studio_name,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/onboarding");
}

export async function completeOnboarding(
  formData: FormData
): Promise<AuthResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Niet ingelogd." };
  }

  const parsed = onboardingSchema.safeParse({
    full_name: formData.get("full_name"),
    studio_name: formData.get("studio_name"),
    kvk_number: formData.get("kvk_number"),
    btw_number: formData.get("btw_number"),
    iban: formData.get("iban"),
    bic: formData.get("bic"),
    address: formData.get("address"),
    city: formData.get("city"),
    postal_code: formData.get("postal_code"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validatiefout" };
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name:
      parsed.data.full_name ||
      user.user_metadata?.full_name ||
      "",
    studio_name:
      parsed.data.studio_name ||
      user.user_metadata?.studio_name ||
      "",
    kvk_number: parsed.data.kvk_number,
    btw_number: parsed.data.btw_number,
    iban: parsed.data.iban,
    bic: parsed.data.bic,
    address: parsed.data.address,
    city: parsed.data.city,
    postal_code: parsed.data.postal_code,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
