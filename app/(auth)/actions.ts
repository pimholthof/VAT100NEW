"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface AuthResult {
  error: string | null;
}

export async function login(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function register(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;
  const studioName = formData.get("studio_name") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        studio_name: studioName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  const plan = formData.get("plan") as string | null;
  const planParam = plan ? `?plan=${plan}` : "";
  redirect(`/onboarding${planParam}`);
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

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name:
      (formData.get("full_name") as string) ||
      user.user_metadata?.full_name ||
      "",
    studio_name:
      (formData.get("studio_name") as string) ||
      user.user_metadata?.studio_name ||
      "",
    kvk_number: formData.get("kvk_number") as string,
    btw_number: formData.get("btw_number") as string,
    iban: formData.get("iban") as string,
    bic: formData.get("bic") as string,
    address: formData.get("address") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/abonnement/kies");
}