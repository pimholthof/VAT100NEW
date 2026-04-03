import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getMolliePayment } from "@/lib/payments/mollie";
import { createServiceClient } from "@/lib/supabase/service";
import { activateSubscriptionAfterPayment } from "@/features/subscriptions/actions";
import { autoProvisionAccount } from "@/features/admin/actions";
import { sendSubscriptionReceipt } from "@/lib/email/send-subscription";

/**
 * Mollie webhook: wordt aangeroepen wanneer een betaalstatus wijzigt.
 * Verwerkt zowel factuurbetalingen als abonnementsbetalingen.
 *
 * Security: Payment is verified by fetching it from the Mollie API using the
 * server-side API key. This ensures only real Mollie payments are processed,
 * regardless of who sent the webhook request.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const paymentId = formData.get("id") as string | null;

    if (!paymentId || typeof paymentId !== "string") {
      return NextResponse.json({ error: "Geen payment ID" }, { status: 400 });
    }

    // Validate payment ID format (Mollie IDs start with "tr_")
    if (!paymentId.startsWith("tr_") || paymentId.length > 50) {
      return NextResponse.json({ error: "Ongeldig payment ID formaat" }, { status: 400 });
    }

    // Fetch the payment from Mollie API — this acts as verification
    // that the payment is real (spoofed webhook requests will fail here)
    const { data: payment, error } = await getMolliePayment(paymentId);
    if (error || !payment) {
      return NextResponse.json({ error: error ?? "Betaling niet gevonden" }, { status: 500 });
    }

    // 1. Check for Lead Payment (Auto-Pilot)
    if (payment.metadata?.type === "lead_payment") {
      return handleLeadPayment(payment, paymentId);
    }

    // 2. Check if this is a subscription payment
    const isSubscriptionPayment =
      payment.metadata?.type === "subscription_first" ||
      payment.subscriptionId;

    if (isSubscriptionPayment) {
      return handleSubscriptionPayment(payment, paymentId);
    }

    // Invoice payment (existing logic)
    return handleInvoicePayment(payment, paymentId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleLeadPayment(
  payment: Awaited<ReturnType<typeof getMolliePayment>>["data"] & {},
  _paymentId: string
) {
  if (payment.status === "paid") {
    const leadId = payment.metadata?.lead_id;
    if (leadId) {
      // TRIGGER AUTO-PROVISIONING
      const result = await autoProvisionAccount(leadId);

      if (result.error) {
        Sentry.captureMessage(`Webhook: Error provisioning lead ${leadId}: ${result.error}`, "error");
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({ status: "lead_activated", leadId });
    }
  }

  if (payment.status === "failed" || payment.status === "expired" || payment.status === "canceled") {
    const leadId = payment.metadata?.lead_id;
    if (leadId) {
      const supabase = createServiceClient();
      await supabase.from("system_events").insert({
        event_type: "lead.payment_expired",
        payload: { lead_id: leadId, status: payment.status }
      });
      return NextResponse.json({ status: "lead_failure_logged", leadId });
    }
  }

  return NextResponse.json({ status: "ignored", paymentStatus: payment.status });
}

async function handleSubscriptionPayment(
  payment: Awaited<ReturnType<typeof getMolliePayment>>["data"] & {},
  paymentId: string,
) {
  const supabase = createServiceClient();

  if (payment.status === "paid") {
    const subscriptionId = payment.metadata?.subscription_id;
    const planId = payment.metadata?.plan_id;

    if (payment.metadata?.type === "subscription_first" && subscriptionId && planId) {
      // First payment — activate subscription and create recurring
      const amountCents = Math.round(parseFloat(payment.amount.value) * 100);
      await activateSubscriptionAfterPayment(
        subscriptionId,
        payment.customerId ?? "",
        planId,
        paymentId,
        amountCents,
      );
      return NextResponse.json({ status: "subscription_activated", subscriptionId });
    }

    // Recurring payment — update period and log
    if (payment.subscriptionId) {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("mollie_subscription_id", payment.subscriptionId)
        .single();

      if (subscription) {
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        const amountCents = Math.round(parseFloat(payment.amount.value) * 100);

        // Generate invoice number: SUB-YYYY-NNNN
        const year = now.getFullYear();
        const { count: existingCount } = await supabase
          .from("subscription_payments")
          .select("*", { count: "exact", head: true })
          .like("invoice_number", `SUB-${year}-%`);
        const seqNum = String((existingCount ?? 0) + 1).padStart(4, "0");
        const invoiceNumber = `SUB-${year}-${seqNum}`;

        await supabase.from("subscription_payments").insert({
          subscription_id: subscription.id,
          mollie_payment_id: paymentId,
          amount_cents: amountCents,
          status: "paid",
          paid_at: now.toISOString(),
          invoice_number: invoiceNumber,
        });

        await supabase.from("subscriptions").update({
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        }).eq("id", subscription.id);

        // Auto-send subscription receipt email
        try {
          const { data: subDetail } = await supabase
            .from("subscriptions")
            .select("user_id, plan:plans(name)")
            .eq("id", subscription.id)
            .single();

          if (subDetail) {
            const userId = subDetail.user_id;
            const planName = (subDetail.plan as unknown as { name: string })?.name ?? "VAT100";

            const [{ data: profile }, { data: authUser }] = await Promise.all([
              supabase.from("profiles").select("full_name").eq("id", userId).single(),
              supabase.auth.admin.getUserById(userId),
            ]);

            const email = authUser?.user?.email;
            const fullName = profile?.full_name ?? "Klant";

            if (email) {
              const receiptResult = await sendSubscriptionReceipt({
                email,
                fullName,
                planName,
                amountCents,
                invoiceNumber,
                periodStart: now.toISOString(),
                periodEnd: periodEnd.toISOString(),
                paidAt: now.toISOString(),
              });

              if (!receiptResult.error) {
                await supabase.from("subscription_payments")
                  .update({ receipt_sent_at: now.toISOString() })
                  .eq("mollie_payment_id", paymentId);
              }
            }
          }
        } catch (receiptError) {
          // Non-fatal: log but don't fail the webhook
          Sentry.captureException(receiptError, {
            tags: { area: "subscription-receipt" },
            extra: { subscriptionId: subscription.id, paymentId },
          });
        }

        return NextResponse.json({ status: "subscription_renewed", subscriptionId: subscription.id });
      }
    }
  }

  if (payment.status === "failed" || payment.status === "expired") {
    // Mark subscription as past_due
    if (payment.subscriptionId) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .update({ status: "past_due", updated_at: new Date().toISOString() })
        .eq("mollie_subscription_id", payment.subscriptionId)
        .select("id")
        .single();

      if (sub) {
        // EMIT SYSTEM EVENT FOR RETENTION AGENT
        await supabase.from("system_events").insert({
          event_type: "subscription.payment_failed",
          payload: { 
            subscription_id: sub.id, 
            mollie_payment_id: paymentId,
            status: payment.status
          }
        });
      }
    }
    return NextResponse.json({ status: "payment_failed_logged" });
  }

  return NextResponse.json({ status: "ignored", paymentStatus: payment.status });
}

async function handleInvoicePayment(
  payment: Awaited<ReturnType<typeof getMolliePayment>>["data"] & {},
  paymentId: string,
) {
  // Alleen verwerken als de betaling daadwerkelijk betaald is
  if (payment.status !== "paid") {
    return NextResponse.json({ status: "ignored", paymentStatus: payment.status });
  }

  const supabase = createServiceClient();

  // Zoek de factuur via mollie_payment_id
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("mollie_payment_id", paymentId)
    .single();

  if (invoiceError || !invoice) {
    return NextResponse.json({ error: "Factuur niet gevonden voor deze betaling" }, { status: 404 });
  }

  // Update factuurstatus naar betaald
  if (invoice.status !== "paid") {
    await supabase
      .from("invoices")
      .update({
        status: "paid",
        payment_method: payment.method ?? "online",
      })
      .eq("id", invoice.id);
  }

  return NextResponse.json({ status: "processed", invoiceId: invoice.id });
}
