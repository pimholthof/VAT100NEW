"use server";

import { requireAuth } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  createMollieCustomer,
  createFirstPayment,
  getCustomerMandates,
  createMollieSubscription,
  cancelMollieSubscription,
} from "@/lib/payments/mollie-subscriptions";
import type { Plan, SubscriptionWithPlan, ActionResult } from "@/lib/types";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

async function getBaseUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function getPlans(): Promise<Plan[]> {
  const auth = await requireAuth();
  if (auth.error !== null) return [];

  const { data } = await auth.supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  return (data ?? []) as Plan[];
}

export async function getActiveSubscription(): Promise<SubscriptionWithPlan | null> {
  const auth = await requireAuth();
  if (auth.error !== null) return null;

  const { data } = await auth.supabase
    .from("subscriptions")
    .select("*, plan:plans(*)")
    .eq("user_id", auth.user.id)
    .in("status", ["active", "past_due", "pending"])
    .single();

  return data as SubscriptionWithPlan | null;
}

export async function startSubscription(
  planId: string,
): Promise<ActionResult<{ checkoutUrl: string }>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };

  const supabase = createServiceClient();

  // Get the plan
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .eq("is_active", true)
    .single();

  if (planError || !plan) {
    return { error: "Ongeldig abonnement." };
  }

  // Check for existing active subscription
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", auth.user.id)
    .in("status", ["active", "pending"])
    .single();

  if (existing) {
    return { error: "Je hebt al een actief abonnement." };
  }

  // Get user email
  const { data: { user } } = await auth.supabase.auth.getUser();
  const email = user?.email ?? "";
  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("full_name, studio_name")
    .eq("id", auth.user.id)
    .single();

  const customerName = profile?.studio_name || profile?.full_name || email;

  // Create Mollie customer
  const customerResult = await createMollieCustomer(customerName, email);
  if (customerResult.error || !customerResult.data) {
    return { error: customerResult.error ?? "Kon klant niet aanmaken bij Mollie." };
  }

  const mollieCustomerId = customerResult.data.id;
  const amountInEuros = plan.price_cents / 100;
  const baseUrl = await getBaseUrl();

  // Create subscription row (pending)
  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .insert({
      user_id: auth.user.id,
      plan_id: planId,
      status: "pending",
      mollie_customer_id: mollieCustomerId,
    })
    .select("id")
    .single();

  if (subError || !subscription) {
    return { error: "Kon abonnement niet aanmaken." };
  }

  // Create first payment (establishes mandate for recurring)
  const paymentResult = await createFirstPayment({
    customerId: mollieCustomerId,
    amount: amountInEuros,
    description: `VAT100 ${plan.name} — eerste betaling`,
    redirectUrl: `${baseUrl}/abonnement/callback?subscription_id=${subscription.id}`,
    webhookUrl: `${baseUrl}/api/webhooks/mollie`,
    metadata: {
      subscription_id: subscription.id,
      plan_id: planId,
      type: "subscription_first",
    },
  });

  if (paymentResult.error || !paymentResult.data) {
    // Clean up the pending subscription
    await supabase.from("subscriptions").delete().eq("id", subscription.id);
    return { error: paymentResult.error ?? "Kon betaling niet aanmaken bij Mollie." };
  }

  const checkoutUrl = paymentResult.data._links.checkout?.href;
  if (!checkoutUrl) {
    return { error: "Geen checkout URL ontvangen van Mollie." };
  }

  return { error: null, data: { checkoutUrl } };
}

export async function activateSubscriptionAfterPayment(
  subscriptionId: string,
  mollieCustomerId: string,
  planId: string,
  molliePaymentId: string,
  amountCents: number,
): Promise<void> {
  const supabase = createServiceClient();

  // Record payment
  await supabase.from("subscription_payments").insert({
    subscription_id: subscriptionId,
    mollie_payment_id: molliePaymentId,
    amount_cents: amountCents,
    status: "paid",
    paid_at: new Date().toISOString(),
  });

  // Get mandate
  const mandateResult = await getCustomerMandates(mollieCustomerId);
  const validMandate = mandateResult.data?.find((m) => m.status === "valid");

  if (!validMandate) {
    // Mandate might still be pending, update subscription to active anyway
    // The recurring subscription will be created when mandate becomes valid
    await supabase.from("subscriptions").update({
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", subscriptionId);
    return;
  }

  // Get plan for amount
  const { data: plan } = await supabase
    .from("plans")
    .select("price_cents, name")
    .eq("id", planId)
    .single();

  if (!plan) return;

  // Create Mollie recurring subscription
  const host = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const mollieSubResult = await createMollieSubscription({
    customerId: mollieCustomerId,
    amount: plan.price_cents / 100,
    interval: "1 month",
    description: `VAT100 ${plan.name} — maandelijks`,
    webhookUrl: `${host}/api/webhooks/mollie`,
  });

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await supabase.from("subscriptions").update({
    status: "active",
    mollie_subscription_id: mollieSubResult.data?.id ?? null,
    mollie_mandate_id: validMandate.id,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    updated_at: now.toISOString(),
  }).eq("id", subscriptionId);
}

export async function checkSubscriptionStatus(
  subscriptionId: string,
): Promise<{ status: string }> {
  const auth = await requireAuth();
  if (auth.error !== null) return { status: "unknown" };

  const { data } = await auth.supabase
    .from("subscriptions")
    .select("status")
    .eq("id", subscriptionId)
    .eq("user_id", auth.user.id)
    .single();

  return { status: data?.status ?? "unknown" };
}

export async function cancelSubscription(): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };

  const supabase = createServiceClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", auth.user.id)
    .in("status", ["active", "past_due"])
    .single();

  if (!subscription) {
    return { error: "Geen actief abonnement gevonden." };
  }

  // Cancel at Mollie if subscription exists
  if (subscription.mollie_customer_id && subscription.mollie_subscription_id) {
    await cancelMollieSubscription(
      subscription.mollie_customer_id,
      subscription.mollie_subscription_id,
    );
  }

  await supabase.from("subscriptions").update({
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", subscription.id);

  return { error: null };
}

export async function changeSubscription(
  newPlanId: string,
): Promise<ActionResult<{ checkoutUrl?: string }>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };

  // Cancel current subscription first
  const cancelResult = await cancelSubscription();
  if (cancelResult.error) return { error: cancelResult.error };

  // Start new subscription
  return startSubscription(newPlanId);
}
