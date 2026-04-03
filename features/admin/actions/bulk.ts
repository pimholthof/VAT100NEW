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

    revalidatePath("/admin/klanten");
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

    revalidatePath("/admin/klanten");
    return { error: null, data: { processed: userIds.length } };
  } catch (e) {
    return { error: sanitizeError(e, { action: "bulkReactivateUsers" }) };
  }
}

// ─── Platform Exports ───

export async function exportAllLeads(): Promise<ActionResult<string>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { data: leads, error } = await supabase
      .from("leads")
      .select("id, email, first_name, last_name, company_name, source, lifecycle_stage, score_fit, score_engagement, created_at")
      .order("created_at", { ascending: false });

    if (error) return { error: sanitizeError(error, { action: "exportAllLeads" }) };

    const { generateCSV } = await import("@/lib/export/csv");
    const headers = ["Naam", "E-mail", "Bedrijf", "Bron", "Fase", "Fit Score", "Engagement", "Aangemeld"];
    const rows = (leads ?? []).map((l) => [
      [l.first_name, l.last_name].filter(Boolean).join(" "),
      l.email || "",
      l.company_name || "",
      l.source || "",
      l.lifecycle_stage || "",
      String(l.score_fit ?? ""),
      String(l.score_engagement ?? ""),
      l.created_at ? new Date(l.created_at).toLocaleDateString("nl-NL") : "",
    ]);

    await logAdminAction(auth.user.id, "data.export", "lead", "bulk", { count: rows.length });
    return { error: null, data: generateCSV(headers, rows) };
  } catch (e) {
    return { error: sanitizeError(e, { action: "exportAllLeads" }) };
  }
}

export async function exportSubscriptions(): Promise<ActionResult<string>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { data: subs, error } = await supabase
      .from("subscriptions")
      .select("id, user_id, status, created_at, plan:plans(name, price_cents)")
      .order("created_at", { ascending: false });

    if (error) return { error: sanitizeError(error, { action: "exportSubscriptions" }) };

    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map<string, string>();
    for (const u of authData?.users ?? []) {
      emailMap.set(u.id, u.email ?? "");
    }

    const { generateCSV } = await import("@/lib/export/csv");
    const headers = ["E-mail", "Plan", "Prijs", "Status", "Aangemeld"];
    const rows = (subs ?? []).map((s) => {
      const plan = s.plan as unknown as { name: string; price_cents: number } | null;
      return [
        emailMap.get(s.user_id) ?? s.user_id,
        plan?.name ?? "",
        plan ? `€${(plan.price_cents / 100).toFixed(2)}` : "",
        s.status || "",
        s.created_at ? new Date(s.created_at).toLocaleDateString("nl-NL") : "",
      ];
    });

    await logAdminAction(auth.user.id, "data.export", "system", "bulk", { type: "subscriptions", count: rows.length });
    return { error: null, data: generateCSV(headers, rows) };
  } catch (e) {
    return { error: sanitizeError(e, { action: "exportSubscriptions" }) };
  }
}

export async function exportAuditLog(): Promise<ActionResult<string>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { data: entries, error } = await supabase
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) return { error: sanitizeError(error, { action: "exportAuditLog" }) };

    const { generateCSV } = await import("@/lib/export/csv");
    const headers = ["Datum", "Admin", "Actie", "Type", "Target", "Details"];
    const rows = (entries ?? []).map((e) => [
      e.created_at ? new Date(e.created_at).toLocaleString("nl-NL") : "",
      e.admin_id || "",
      e.action || "",
      e.target_type || "",
      e.target_id || "",
      e.metadata ? JSON.stringify(e.metadata) : "",
    ]);

    await logAdminAction(auth.user.id, "data.export", "system", "bulk", { type: "audit_log", count: rows.length });
    return { error: null, data: generateCSV(headers, rows) };
  } catch (e) {
    return { error: sanitizeError(e, { action: "exportAuditLog" }) };
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
