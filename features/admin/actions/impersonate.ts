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

    await setImpersonation(userId);
    await logAdminAction(auth.user.id, "impersonation.start", "user", userId, {
      targetName: profile.full_name,
    });

    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "startImpersonation" }) };
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
