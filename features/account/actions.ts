"use server";

import { requireAuth } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";

/**
 * AVG-verwijderverzoek. Deactiveert het account direct (status 'suspended')
 * en legt het verzoek vast. Volledige wissing volgt ná de fiscale
 * bewaartermijn of door een admin — daarom hier geen harde verwijdering.
 * De gebruiker wordt uitgelogd.
 */
export async function requestAccountDeletion(): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { user } = auth;

  const admin = createServiceClient();
  const { error } = await admin
    .from("profiles")
    .update({
      deletion_requested_at: new Date().toISOString(),
      status: "suspended",
    })
    .eq("id", user.id);

  if (error) return { error: "Kon het verzoek niet verwerken. Probeer het later opnieuw." };

  // Admin op de hoogte stellen (best-effort, niet blokkerend).
  try {
    await admin.from("system_events").insert({
      event_type: "account.deletion_requested",
      payload: { user_id: user.id, email: user.email },
    });
  } catch {
    // niet blokkerend
  }

  await auth.supabase.auth.signOut();
  return { error: null };
}
