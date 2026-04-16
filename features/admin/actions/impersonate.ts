"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";
import { sanitizeError } from "@/lib/errors";
import { logAdminAction } from "@/lib/admin/audit";
import { setImpersonation, clearImpersonation } from "@/lib/admin/impersonate";

export async function startImpersonation(userId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  if (userId === auth.user.id) {
    return { error: "Je kunt niet jezelf impersoneren." };
  }

  try {
    const supabase = createServiceClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    if (!profile) return { error: "Gebruiker niet gevonden." };

    const { data: authUser } = await supabase.auth.admin.getUserById(userId);

    await setImpersonation(userId);
    await logAdminAction(auth.user.id, "impersonation.start", "user", userId, {
      targetName: profile.full_name,
    });

    // AVG-transparantie: zichtbare notitie + e-mail naar de gebruiker
    await notifyUserOfAdminAccess({
      userId,
      userEmail: authUser?.user?.email ?? null,
      adminId: auth.user.id,
    });

    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "startImpersonation" }) };
  }
}

async function notifyUserOfAdminAccess(opts: {
  userId: string;
  userEmail: string | null;
  adminId: string;
}): Promise<void> {
  const supabase = createServiceClient();
  const startedAt = new Date();
  const formatted = startedAt.toLocaleString("nl-NL", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Amsterdam",
  });

  // 1. Zichtbaar in de actie-feed van de gebruiker
  try {
    await supabase.from("action_feed").insert({
      user_id: opts.userId,
      type: "admin_access",
      status: "pending",
      title: "Een beheerder heeft tijdelijk toegang genomen tot je account",
      description: `Op ${formatted} heeft een VAT100-beheerder zich tijdelijk in jouw account aangemeld voor support of foutonderzoek. Maximale duur: 30 minuten. Heb je hier vragen over? Mail privacy@vat100.nl.`,
    });
  } catch {
    // Feed-insert mag de support-flow niet blokkeren
  }

  // 2. E-mail (best-effort, niet blocking)
  if (!opts.userEmail) return;
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "support@vat100.nl",
      to: opts.userEmail,
      subject: "Beheerder heeft tijdelijk toegang genomen tot je VAT100-account",
      text: [
        `Beste,`,
        ``,
        `Op ${formatted} heeft een VAT100-beheerder zich tijdelijk in jouw account aangemeld.`,
        `Dit gebeurt alleen voor support of foutonderzoek en duurt maximaal 30 minuten.`,
        ``,
        `Je vindt deze melding ook terug in je activiteitenoverzicht in de app.`,
        ``,
        `Vragen? Reageer op deze e-mail of mail privacy@vat100.nl.`,
        ``,
        `— VAT100`,
      ].join("\n"),
    });
  } catch {
    // E-mail mag de support-flow niet blokkeren
  }
}

export async function stopImpersonation(): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    await clearImpersonation();
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "stopImpersonation" }) };
  }
}
