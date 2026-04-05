import { createServiceClient } from "@/lib/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Agent, SystemEventRow } from "../types";
import { sendPaymentNudge, sendBillingAlert } from "@/lib/email/send-retention";

/**
 * Agent 3: The Retention Guard
 * 
 * This agent monitors churn risks and lead inactivity.
 * It identifies failed payments, expired lead links, and long-term user inactivity.
 */
export const retentionAgent: Agent = {
  name: "Retention Agent",
  description: "Monitors churn risks, failed payments, and lead stagnation.",
  targetEvents: [
    "subscription.payment_failed",
    "lead.payment_expired",
    "system.daily_maintenance"
  ],
  
  run: async (event: SystemEventRow) => {
    const supabase = createServiceClient();
    const type = event.event_type;

    try {
      if (type === "subscription.payment_failed") {
        return handleFailedPayment(supabase, event.payload);
      }

      if (type === "lead.payment_expired") {
        return handleExpiredLead(supabase, event.payload);
      }

      if (type === "system.daily_maintenance") {
        return runDailyMaintenance(supabase);
      }

      return true;
    } catch (err) {
      console.error(`[Retention Agent] Unexpected error:`, err);
      return false;
    }
  }
};

async function handleFailedPayment(supabase: SupabaseClient, payload: Record<string, unknown>) {
  const { subscription_id, mollie_payment_id } = payload;
  
  if (!subscription_id) return false;


  // 1. Fetch user data
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("user_id, plan:plans(name), amount:plans(price_cents)")
    .eq("id", subscription_id)
    .single();

  if (sub?.user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, studio_name")
      .eq("id", sub.user_id)
      .single();

    if (profile?.email) {
      // 2. Log Activity
      await supabase.from("user_activities").insert({
        user_id: sub.user_id,
        activity_type: "billing_alert",
        description: "Mislukte abonnementsbetaling gedetecteerd. Billing Alert verzonden.",
        metadata: { mollie_payment_id }
      });

      // 3. SEND EMAIL
      const amountStr = `€${(Number(sub.amount) / 100).toFixed(2)}`;
      sendBillingAlert({
        email: profile.email,
        fullName: profile.full_name || profile.studio_name || "Founder",
        amount: amountStr
      }).catch(err => console.error("[Retention Agent] Billing email error:", err));
    }
  }

  return true;
}

async function handleExpiredLead(supabase: SupabaseClient, payload: Record<string, unknown>) {
  const lead_id = payload.lead_id as string | undefined;
  if (!lead_id) return false;


  // 1. Fetch lead data
  const { data: lead } = await supabase
    .from("leads")
    .select("email, plans!target_plan_id(name)")
    .eq("id", lead_id)
    .single();

  if (lead?.email) {
    // 2. Update lead stage
    await supabase
      .from("leads")
      .update({ 
        lifecycle_stage: "On hold",
        updated_at: new Date().toISOString()
      })
      .eq("id", lead_id);

    await supabase.from("lead_activities").insert({
      lead_id,
      activity_type: "system_note",
      description: "Betaallink verlopen. Nudge email verzonden naar lead."
    });

    // 3. SEND EMAIL
    sendPaymentNudge({
      email: lead.email,
      leadId: lead_id,
      planName: (Array.isArray(lead.plans) ? lead.plans[0]?.name : (lead.plans as Record<string, unknown>)?.name as string) || "Premium Plan"
    }).catch(err => console.error("[Retention Agent] Nudge email error:", err));
  }

  return true;
}

async function runDailyMaintenance(supabase: SupabaseClient) {

  // 1. Find leads stuck in "Plan Gekozen" for > 48 hours
  const twoDaysAgo = new Date();
  twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

  const { data: stuckLeads } = await supabase
    .from("leads")
    .select("id, email")
    .eq("lifecycle_stage", "Plan Gekozen")
    .lt("updated_at", twoDaysAgo.toISOString());

  // Emit lead.stuck_in_pipeline events for stuck leads
  for (const lead of stuckLeads ?? []) {
    await supabase.from("system_events").insert({
      event_type: "lead.stuck_in_pipeline",
      payload: { lead_id: lead.id, email: lead.email, stage: "Plan Gekozen" },
    });

    // Send a nudge email if we have their email
    if (lead.email) {
      sendPaymentNudge({
        email: lead.email,
        leadId: lead.id,
        planName: "VAT100",
      }).catch((err) => console.error("[Retention Agent] Stuck lead nudge error:", err));
    }
  }

  // 2. Find users with no activity in 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: inactiveUsers } = await supabase
    .from("profiles")
    .select("id, full_name")
    .lt("updated_at", thirtyDaysAgo.toISOString())
    .neq("role", "admin");

  // Record churn risk events for inactive users
  for (const user of inactiveUsers ?? []) {
    await supabase.from("system_events").insert({
      event_type: "user.inactive_30d",
      payload: { user_id: user.id, full_name: user.full_name },
    });
  }

  return true;
}
