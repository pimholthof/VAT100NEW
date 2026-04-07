"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { sendPaymentNudge, sendBillingAlert } from "@/lib/email/send-retention";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/types";

export async function manualNudgeLead(leadId: string): Promise<ActionResult> {
  const supabase = createServiceClient();

  // 1. Fetch Lead
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("email, plans!target_plan_id(name)")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) return { error: "Lead niet gevonden." };

  // 2. Send Nudge
  const planObj = Array.isArray(lead.plans) ? lead.plans[0] : lead.plans;
  const planName = planObj?.name || "Premium Plan";

  const emailResult = await sendPaymentNudge({
    email: lead.email,
    leadId: leadId,
    planName: planName
  });

  if (emailResult.error) return { error: emailResult.error };

  // 3. Log Activity
  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    activity_type: "system_note",
    description: "Handmatige nudge e-mail verzonden door Admin."
  });

  revalidatePath("/admin");
  return { error: null };
}

export async function manualBillingAlert(userId: string): Promise<ActionResult> {
  const supabase = createServiceClient();

  // 1. Fetch Profile & Subscription
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, studio_name")
    .eq("id", userId)
    .single();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan:plans(price_cents)")
    .eq("user_id", userId)
    .single();

  if (!profile?.email || !sub) return { error: "Geen profiel of abonnement gevonden voor deze gebruiker." };

  // 2. Send Alert
  const planObj = Array.isArray(sub.plan) ? sub.plan[0] : sub.plan;
  const planPrice = planObj?.price_cents || 0;
  const amountStr = `€${(planPrice / 100).toFixed(2)}`;

  const emailResult = await sendBillingAlert({
    email: profile.email,
    fullName: profile.full_name || profile.studio_name || "Founder",
    amount: amountStr
  });

  if (emailResult.error) return { error: emailResult.error };

  // 3. Log Activity
  await supabase.from("user_activities").insert({
    user_id: userId,
    activity_type: "billing_alert",
    description: "Handmatige billing alert e-mail verzonden door Admin."
  });

  revalidatePath("/admin");
  return { error: null };
}
