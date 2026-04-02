import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv } from "@/lib/utils/env";
import * as Sentry from "@sentry/nextjs";

export function createServiceClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}

/**
 * Log a service-level operation for audit purposes.
 * Non-blocking — failures are captured in Sentry but don't propagate.
 */
export async function logServiceOperation(
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("admin_audit_log").insert({
      admin_id: "00000000-0000-0000-0000-000000000000", // system
      action,
      target_type: targetType,
      target_id: targetId,
      metadata: metadata ?? {},
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { area: "service-audit" },
      extra: { action, targetType, targetId },
    });
  }
}
