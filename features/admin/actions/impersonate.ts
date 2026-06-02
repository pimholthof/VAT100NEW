"use server";

import { headers } from "next/headers";
import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";
import { sanitizeError } from "@/lib/errors";
import { logAdminAction } from "@/lib/admin/audit";
import {
  setImpersonation,
  clearImpersonation,
  getImpersonationSessionId,
  getImpersonationCookieUserId,
} from "@/lib/admin/impersonate";

async function requestContext() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent") ?? null,
  };
}

export async function startImpersonation(
  userId: string,
  reason?: string,
): Promise<ActionResult> {
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

    const { ip, userAgent } = await requestContext();

    // Tamper-proof sessie openen (start, IP, user-agent).
    const { data: session } = await supabase
      .from("impersonation_sessions")
      .insert({
        admin_id: auth.user.id,
        impersonated_user_id: userId,
        ip_address: ip,
        user_agent: userAgent,
        reason: reason ?? null,
      })
      .select("id")
      .single();

    await setImpersonation(userId, session?.id ?? "");
    await logAdminAction(
      auth.user.id,
      "impersonation.start",
      "user",
      userId,
      { targetName: profile.full_name, sessionId: session?.id ?? null },
      ip,
    );

    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "startImpersonation" }) };
  }
}

export async function stopImpersonation(): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const sessionId = await getImpersonationSessionId();
    const impersonatedUserId = await getImpersonationCookieUserId();
    const { ip } = await requestContext();

    if (sessionId) {
      const supabase = createServiceClient();
      // Sluit de sessie. De DB-trigger borgt dat ended_at maar één keer kan.
      await supabase
        .from("impersonation_sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", sessionId)
        .is("ended_at", null);

      await logAdminAction(
        auth.user.id,
        "impersonation.stop",
        "user",
        impersonatedUserId ?? "unknown",
        { sessionId },
        ip,
      );
    }

    await clearImpersonation();
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "stopImpersonation" }) };
  }
}
