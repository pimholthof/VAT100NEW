import { createServiceClient } from "@/lib/supabase/service";

export type AuditAction =
  | "user.suspend"
  | "user.reactivate"
  | "user.delete"
  | "user.anonymize"
  | "customer.create"
  | "customer.profile_update"
  | "customer.bulk_action"
  | "invoice.status_change"
  | "lead.stage_change"
  | "lead.plan_change"
  | "lead.provision"
  | "lead.task_toggle"
  | "lead.payment_initiated"
  | "settings.update"
  | "impersonation.start"
  | "data.export"
  | "agent.classification"
  | "agent.tax_alert"
  | "agent.match_suggestion"
  | "agent.autonomous_action"
  | "agent.audit_completed";

export type AuditTargetType =
  | "user"
  | "customer"
  | "client"
  | "receipt"
  | "invoice"
  | "lead"
  | "setting"
  | "system"
  | "agent_action"
  | "action_feed";

export async function logAdminAction(
  adminId: string,
  action: AuditAction,
  targetType: AuditTargetType,
  targetId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("admin_audit_log").insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata: metadata ?? {},
    });
  } catch (e) {
    // Audit logging should never break the main operation
    console.error("[AuditLog] Failed to log action:", e);
  }
}
