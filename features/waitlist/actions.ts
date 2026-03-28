"use server";

import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";
import { Resend } from "resend";
import { z } from "zod";

const NOTIFY_EMAIL = "pimholthof@gmail.com";

const waitlistSchema = z.object({
  email: z.string().trim().email("Ongeldig e-mailadres"),
  name: z.string().trim().min(1, "Naam is verplicht"),
  referral: z.string().trim().optional(),
});

export async function joinWaitlist(formData: FormData): Promise<ActionResult<{ position: number }>> {
  const raw = {
    email: formData.get("email") as string,
    name: formData.get("name") as string,
    referral: (formData.get("referral") as string) || undefined,
  };

  const result = waitlistSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Validatiefout" };
  }

  const { email, name, referral } = result.data;

  try {
    const supabase = createServiceClient();

    // Check if already on waitlist
    const { data: existing } = await supabase
      .from("waitlist")
      .select("id")
      .eq("email", email)
      .single();

    if (existing) {
      return { error: "Dit e-mailadres staat al op de wachtlijst." };
    }

    // Insert
    const { error: insertError } = await supabase
      .from("waitlist")
      .insert({ email, name, referral: referral || null });

    if (insertError) {
      // Unique constraint violation
      if (insertError.code === "23505") {
        return { error: "Dit e-mailadres staat al op de wachtlijst." };
      }
      return { error: "Er is een fout opgetreden. Probeer het opnieuw." };
    }

    // Get position
    const { count } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    const position = count ?? 1;

    // Send notification email (fire-and-forget)
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      resend.emails.send({
        from: process.env.EMAIL_FROM || "VAT100 <onboarding@resend.dev>",
        to: NOTIFY_EMAIL,
        subject: `Nieuwe waitlist-aanmelding: ${name}`,
        html: `
          <p><strong>${name}</strong> (${email}) heeft zich aangemeld voor de wachtlijst.</p>
          <p>Positie: #${position}</p>
          ${referral ? `<p>Referral: ${referral}</p>` : ""}
        `,
      }).catch((err) => console.error("[joinWaitlist] Notification email failed:", err));
    }

    return { error: null, data: { position } };
  } catch (err) {
    console.error("[joinWaitlist] Unexpected error:", err);
    return { error: "Er is een fout opgetreden. Probeer het opnieuw." };
  }
}
