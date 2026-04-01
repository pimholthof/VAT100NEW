"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";
import { sanitizeError } from "@/lib/errors";

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  admin_name: string | null;
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function getAuditLog(filters?: {
  action?: string;
  targetType?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{ entries: AuditLogEntry[]; total: number }>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("admin_audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters?.action && filters.action !== "all") {
      query = query.eq("action", filters.action);
    }
    if (filters?.targetType && filters.targetType !== "all") {
      query = query.eq("target_type", filters.targetType);
    }

    const { data, count, error } = await query;
    if (error) return { error: sanitizeError(error, { action: "getAuditLog" }) };

    // Get admin names
    const adminIds = [...new Set((data ?? []).map((d) => d.admin_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", adminIds.length > 0 ? adminIds : ["__none__"]);

    const nameMap = new Map<string, string>();
    for (const p of profiles ?? []) {
      nameMap.set(p.id, p.full_name ?? "Admin");
    }

    const entries: AuditLogEntry[] = (data ?? []).map((d) => ({
      id: d.id,
      admin_id: d.admin_id,
      admin_name: nameMap.get(d.admin_id) ?? "Onbekend",
      action: d.action,
      target_type: d.target_type,
      target_id: d.target_id,
      metadata: (d.metadata as Record<string, unknown>) ?? {},
      created_at: d.created_at,
    }));

    return { error: null, data: { entries, total: count ?? 0 } };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getAuditLog" }) };
  }
}
