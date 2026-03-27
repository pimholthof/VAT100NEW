"use server";

import { createServiceClient } from "@/lib/supabase/service";

export interface WaitlistResult {
  success: boolean;
  error: string | null;
}

export async function joinWaitlist(formData: FormData): Promise<WaitlistResult> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();

  if (!email) {
    return { success: false, error: "Vul een e-mailadres in." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Vul een geldig e-mailadres in." };
  }

  const supabase = createServiceClient();

  const { error } = await supabase.from("waitlist").insert({ email });

  if (error) {
    // Unique violation — treat as success (don't reveal existing emails)
    if (error.code === "23505") {
      return { success: true, error: null };
    }
    return { success: false, error: "Er ging iets mis. Probeer het opnieuw." };
  }

  return { success: true, error: null };
}
