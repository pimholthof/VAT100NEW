import { createServiceClient } from "@/lib/supabase/service";
import { sendSubscriptionReminder } from "@/lib/email/send-subscription";
import { formatCurrency } from "@/lib/format";
import * as Sentry from "@sentry/nextjs";

/**
 * Process past_due subscriptions and send escalating payment reminders.
 *
 * Escalation schedule:
 *   Step 1: After 3 days past_due — friendly reminder
 *   Step 2: After 7 days — formal demand (aanmaning)
 *   Step 3: After 14 days — final warning with cancellation threat
 *
 * Minimum 3 days between each escalation step.
 */
export async function processSubscriptionReminders(): Promise<{
  processed: number;
  results: Array<{
    subscriptionId: string;
    step: number;
    emailSent: boolean;
    error?: string;
  }>;
}> {
  const supabase = createServiceClient();

  // Find all past_due subscriptions with plan + user info
  const { data: pastDueSubs, error } = await supabase
    .from("subscriptions")
    .select("id, user_id, plan:plans(name, price_cents), updated_at")
    .eq("status", "past_due");

  if (error) throw new Error(error.message);
  if (!pastDueSubs || pastDueSubs.length === 0) {
    return { processed: 0, results: [] };
  }

  // Get auth emails for all affected users
  const userIds = [...new Set(pastDueSubs.map((s) => s.user_id))];
  const [{ data: profiles }, { data: authData }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", userIds),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const profileMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    profileMap.set(p.id, p.full_name ?? "Klant");
  }
  const emailMap = new Map<string, string>();
  for (const u of authData?.users ?? []) {
    emailMap.set(u.id, u.email ?? "");
  }

  const now = Date.now();
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

  const settled = await Promise.allSettled(
    pastDueSubs.map(async (sub) => {
      const plan = sub.plan as unknown as { name: string; price_cents: number } | null;
      const planName = plan?.name ?? "VAT100";
      const amount = formatCurrency((plan?.price_cents ?? 0) / 100);
      const email = emailMap.get(sub.user_id);
      const fullName = profileMap.get(sub.user_id) ?? "Klant";

      if (!email) {
        return { subscriptionId: sub.id, step: 0, emailSent: false, error: "Geen e-mail" };
      }

      // Check last reminder sent for this subscription
      const { data: lastReminder } = await supabase
        .from("subscription_reminders")
        .select("step, sent_at")
        .eq("subscription_id", sub.id)
        .order("step", { ascending: false })
        .limit(1);

      const lastStep = lastReminder?.[0]?.step ?? 0;
      const lastSentAt = lastReminder?.[0]?.sent_at;

      // Don't exceed step 3
      if (lastStep >= 3) {
        return { subscriptionId: sub.id, step: lastStep, emailSent: false };
      }

      // Calculate days since last reminder or since becoming past_due
      const daysSinceLast = lastSentAt
        ? now - new Date(lastSentAt).getTime()
        : now - new Date(sub.updated_at).getTime();

      // Determine if we should send a reminder and at which step
      let nextStep = 0;
      const daysPastDue = now - new Date(sub.updated_at).getTime();

      if (lastStep === 0 && daysPastDue >= THREE_DAYS) {
        nextStep = 1;
      } else if (lastStep === 1 && daysSinceLast >= THREE_DAYS && daysPastDue >= SEVEN_DAYS) {
        nextStep = 2;
      } else if (lastStep === 2 && daysSinceLast >= THREE_DAYS && daysPastDue >= FOURTEEN_DAYS) {
        nextStep = 3;
      }

      if (nextStep === 0) {
        return { subscriptionId: sub.id, step: lastStep, emailSent: false };
      }

      // Send the reminder email
      const result = await sendSubscriptionReminder({
        email,
        fullName,
        planName,
        amount,
        step: nextStep,
      });

      if (!result.error) {
        // Track the reminder
        await supabase.from("subscription_reminders").insert({
          subscription_id: sub.id,
          step: nextStep,
          status: "sent",
        });

        // Emit system event for admin visibility
        await supabase.from("system_events").insert({
          event_type: "subscription.reminder_sent",
          payload: {
            subscription_id: sub.id,
            user_id: sub.user_id,
            step: nextStep,
            email,
          },
        });
      }

      return {
        subscriptionId: sub.id,
        step: nextStep,
        emailSent: !result.error,
        error: result.error ?? undefined,
      };
    })
  );

  const results = settled.map((result, index) => {
    if (result.status === "fulfilled") return result.value;
    const sub = pastDueSubs[index];
    Sentry.captureException(result.reason, {
      tags: { area: "subscription-reminders" },
      extra: { subscriptionId: sub?.id },
    });
    return {
      subscriptionId: sub?.id ?? "unknown",
      step: 0,
      emailSent: false,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });

  return { processed: pastDueSubs.length, results };
}
