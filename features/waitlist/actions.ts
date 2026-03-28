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

    // Send emails (fire-and-forget)
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.EMAIL_FROM || "VAT100 <onboarding@resend.dev>";

      // Notification to admin
      resend.emails.send({
        from,
        to: NOTIFY_EMAIL,
        subject: `Nieuwe waitlist-aanmelding: ${name}`,
        html: `
          <p><strong>${name}</strong> (${email}) heeft zich aangemeld voor de wachtlijst.</p>
          <p>Positie: #${position}</p>
          ${referral ? `<p>Referral: ${referral}</p>` : ""}
        `,
      }).catch((err) => console.error("[joinWaitlist] Admin notification failed:", err));

      // Confirmation to user
      resend.emails.send({
        from,
        to: email,
        subject: "VAT100 — Je staat op de wachtlijst",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 0;">
            <p style="font-size: 14px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin: 0 0 32px; color: #000;">VAT100</p>
            <p style="font-size: 14px; line-height: 1.7; color: #333; margin: 0 0 12px;">${name},</p>
            <p style="font-size: 14px; line-height: 1.7; color: #333; margin: 0 0 12px;">Je aanmelding is genoteerd. Je staat op positie #${position} van de wachtlijst.</p>
            <p style="font-size: 14px; line-height: 1.7; color: #333; margin: 0 0 12px;">VAT100 is boekhoudsoftware voor creatieve freelancers in Nederland. Facturatie, BTW-aangifte en bonnen — zonder gedoe.</p>
            <p style="font-size: 14px; line-height: 1.7; color: #333; margin: 0;">Zodra de website klaar is, sturen we je een mail.</p>
          </div>
        `,
      }).catch((err) => console.error("[joinWaitlist] Confirmation email failed:", err));
    }

    return { error: null, data: { position } };
  } catch (err) {
    console.error("[joinWaitlist] Unexpected error:", err);
    return { error: "Er is een fout opgetreden. Probeer het opnieuw." };
  }
}
