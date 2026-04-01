"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";
import { sanitizeError } from "@/lib/errors";
import { logAdminAction } from "@/lib/admin/audit";

export interface SystemSetting {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

export async function getSystemSettings(): Promise<ActionResult<SystemSetting[]>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("system_settings")
      .select("*")
      .order("key", { ascending: true });

    if (error) return { error: sanitizeError(error, { action: "getSystemSettings" }) };

    const settings: SystemSetting[] = (data ?? []).map((s) => ({
      key: s.key,
      value: s.value,
      description: s.description,
      updated_at: s.updated_at,
    }));

    return { error: null, data: settings };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getSystemSettings" }) };
  }
}

export async function updateSystemSetting(
  key: string,
  value: unknown
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("system_settings")
      .update({
        value: JSON.parse(JSON.stringify(value)),
        updated_by: auth.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("key", key);

    if (error) return { error: sanitizeError(error, { action: "updateSystemSetting" }) };

    await logAdminAction(auth.user.id, "settings.update", "setting", key, { value });
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "updateSystemSetting" }) };
  }
}
