import { createServiceClient } from "@/lib/supabase/service";
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
    const type = event.type;

    console.log(`[Retention Agent] Processing event: ${type}...`);

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

async function handleFailedPayment(supabase: any, payload: any) {
  const { subscription_id, mollie_payment_id } = payload;
  
  if (!subscription_id) return false;

  console.log(`[Retention Agent] Recording churn risk for sub: ${subscription_id}`);

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
      const amountStr = `€${(sub.amount / 100).toFixed(2)}`;
      sendBillingAlert({
        email: profile.email,
        fullName: profile.full_name || profile.studio_name || "Founder",
        amount: amountStr
      }).catch(err => console.error("[Retention Agent] Billing email error:", err));
    }
  }

  return true;
}

async function handleExpiredLead(supabase: any, payload: any) {
  const { lead_id } = payload;
  if (!lead_id) return false;

  console.log(`[Retention Agent] Nudging expired lead: ${lead_id}`);

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
      planName: lead.plans?.name || "Premium Plan"
    }).catch(err => console.error("[Retention Agent] Nudge email error:", err));
  }

  return true;
}

async function runDailyMaintenance(supabase: any) {
  console.log(`[Retention Agent] Running daily maintenance check...`);

  // 1. Find leads stuck in "Plan Gekozen" for > 48 hours
  const twoDaysAgo = new Date();
  twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

  const { data: stuckLeads } = await supabase
    .from("leads")
    .select("id, email")
    .eq("lifecycle_stage", "Plan Gekozen")
    .lt("updated_at", twoDaysAgo.toISOString());

  for (const lead of stuckLeads || []) {
    console.log(`[Retention Agent] Flagging stuck lead for nudge: ${lead.email}`);
    // Emit event: lead.stuck_in_pipeline
  }

  // 2. Find users with no activity in 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // This is a simplified check - in reality, we'd check latest doc/invoice date
  const { data: inactiveUsers } = await supabase
    .from("profiles")
    .select("id, full_name")
    .lt("updated_at", thirtyDaysAgo.toISOString());

  for (const user of inactiveUsers || []) {
    console.log(`[Retention Agent] Flagging inactive user: ${user.full_name}`);
    // Record risk in a new health table or log activity
  }

  return true;
}
