"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";
import { sanitizeError } from "@/lib/errors";
import { logAdminAction } from "@/lib/admin/audit";
import { revalidatePath } from "next/cache";

export async function bulkSuspendUsers(userIds: string[]): Promise<ActionResult<{ processed: number }>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  if (userIds.length === 0) return { error: "Geen gebruikers geselecteerd." };
  if (userIds.length > 100) return { error: "Maximaal 100 gebruikers per keer." };

  // Prevent self-suspension
  if (userIds.includes(auth.user.id)) {
    return { error: "Je kunt je eigen account niet deactiveren." };
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("profiles")
      .update({ status: "suspended" })
      .in("id", userIds);

    if (error) return { error: sanitizeError(error, { action: "bulkSuspendUsers" }) };

    await logAdminAction(auth.user.id, "customer.bulk_action", "user", "bulk", {
      action: "suspend",
      count: userIds.length,
      userIds,
    });

    revalidatePath("/admin/users");
    return { error: null, data: { processed: userIds.length } };
  } catch (e) {
    return { error: sanitizeError(e, { action: "bulkSuspendUsers" }) };
  }
}

export async function bulkReactivateUsers(userIds: string[]): Promise<ActionResult<{ processed: number }>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  if (userIds.length === 0) return { error: "Geen gebruikers geselecteerd." };
  if (userIds.length > 100) return { error: "Maximaal 100 gebruikers per keer." };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("profiles")
      .update({ status: "active" })
      .in("id", userIds);

    if (error) return { error: sanitizeError(error, { action: "bulkReactivateUsers" }) };

    await logAdminAction(auth.user.id, "customer.bulk_action", "user", "bulk", {
      action: "reactivate",
      count: userIds.length,
      userIds,
    });

    revalidatePath("/admin/users");
    return { error: null, data: { processed: userIds.length } };
  } catch (e) {
    return { error: sanitizeError(e, { action: "bulkReactivateUsers" }) };
  }
}

export async function bulkExportCustomers(userIds: string[]): Promise<ActionResult<string>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  if (userIds.length === 0) return { error: "Geen klanten geselecteerd." };

  try {
    const supabase = createServiceClient();

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*, subscriptions(status, plan:plans(name))")
      .in("id", userIds);

    if (error) return { error: sanitizeError(error, { action: "bulkExportCustomers" }) };

    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map<string, string>();
    for (const u of authData?.users ?? []) {
      emailMap.set(u.id, u.email ?? "");
    }

    const { generateCSV } = await import("@/lib/export/csv");

    const headers = ["Naam", "Studio", "E-mail", "Status", "Plan", "KVK", "BTW-nummer", "IBAN", "Stad", "Aangemeld"];
    const rows = (profiles ?? []).map((p) => {
      const sub = Array.isArray(p.subscriptions) ? p.subscriptions[0] : null;
      return [
        p.full_name || "",
        p.studio_name || "",
        emailMap.get(p.id) ?? "",
        p.status ?? "active",
        (sub?.plan as { name: string } | null)?.name ?? "",
        p.kvk_number || "",
        p.btw_number || "",
        p.iban || "",
        p.city || "",
        p.created_at ? new Date(p.created_at).toLocaleDateString("nl-NL") : "",
      ];
    });

    await logAdminAction(auth.user.id, "data.export", "customer", "bulk", { count: userIds.length });

    return { error: null, data: generateCSV(headers, rows) };
  } catch (e) {
    return { error: sanitizeError(e, { action: "bulkExportCustomers" }) };
  }
}
