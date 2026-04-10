"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isRateLimited } from "@/lib/rate-limit";
import { headers } from "next/headers";

export interface AuthResult {
  error: string | null;
}

async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function login(formData: FormData): Promise<AuthResult> {
  const ip = await getClientIp();
  if (await isRateLimited(`auth-login:${ip}`, 10, 60_000)) {
    return { error: "Te veel pogingen. Probeer het over een minuut opnieuw." };
  }

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
  const ip = await getClientIp();
  if (await isRateLimited(`auth-register:${ip}`, 5, 60_000)) {
    return { error: "Te veel pogingen. Probeer het over een minuut opnieuw." };
  }

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
  const plan = formData.get("plan") as string | null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Niet ingelogd." };
  }

  const estimatedIncomeRaw = formData.get("estimated_annual_income") as string;
  const estimatedIncome = estimatedIncomeRaw ? parseFloat(estimatedIncomeRaw) : null;

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
    vat_frequency: (formData.get("vat_frequency") as string) || "quarterly",
    bookkeeping_start_date: (formData.get("bookkeeping_start_date") as string) || null,
    uses_kor: formData.get("uses_kor") === "true",
    estimated_annual_income: estimatedIncome && !isNaN(estimatedIncome) ? estimatedIncome : null,
    meets_urencriterium: formData.get("meets_urencriterium") !== "false",
    onboarding_completed_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  const planParam = plan ? `?plan=${plan}` : "";
  redirect(`/abonnement/kies${planParam}`);
}