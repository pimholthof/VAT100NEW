import { NextRequest, NextResponse } from "next/server";
import { getMolliePayment } from "@/lib/payments/mollie";
import { createServiceClient } from "@/lib/supabase/service";
import { activateSubscriptionAfterPayment } from "@/features/subscriptions/actions";

/**
 * Mollie webhook: wordt aangeroepen wanneer een betaalstatus wijzigt.
 * Verwerkt zowel factuurbetalingen als abonnementsbetalingen.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const paymentId = formData.get("id") as string | null;

    if (!paymentId) {
      return NextResponse.json({ error: "Geen payment ID" }, { status: 400 });
    }

    const { data: payment, error } = await getMolliePayment(paymentId);
    if (error || !payment) {
      return NextResponse.json({ error: error ?? "Betaling niet gevonden" }, { status: 500 });
    }

    // Check if this is a subscription payment
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

        await supabase.from("subscription_payments").insert({
          subscription_id: subscription.id,
          mollie_payment_id: paymentId,
          amount_cents: Math.round(parseFloat(payment.amount.value) * 100),
          status: "paid",
          paid_at: now.toISOString(),
        });

        await supabase.from("subscriptions").update({
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        }).eq("id", subscription.id);

        return NextResponse.json({ status: "subscription_renewed", subscriptionId: subscription.id });
      }
    }
  }

  if (payment.status === "failed") {
    // Mark subscription as past_due
    if (payment.subscriptionId) {
      await supabase
        .from("subscriptions")
        .update({ status: "past_due", updated_at: new Date().toISOString() })
        .eq("mollie_subscription_id", payment.subscriptionId);
    }
    return NextResponse.json({ status: "payment_failed" });
  }

  return NextResponse.json({ status: "ignored", paymentStatus: payment.status });
}

async function handleInvoicePayment(
  payment: Awaited<ReturnType<typeof getMolliePayment>>["data"] & {},
  paymentId: string,
) {
  const supabase = createServiceClient();

  // Zoek de factuur via mollie_payment_id
  let invoice: { id: string; status: string } | null = null;

  const { data: byPaymentId } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("mollie_payment_id", paymentId)
    .maybeSingle();

  invoice = byPaymentId;

  // Fallback: zoek via metadata.invoice_id als mollie_payment_id geen match geeft
  if (!invoice && payment.metadata?.invoice_id) {
    const { data: byMetadata } = await supabase
      .from("invoices")
      .select("id, status")
      .eq("id", payment.metadata.invoice_id)
      .maybeSingle();
    invoice = byMetadata;
  }

  if (!invoice) {
    return NextResponse.json({ error: "Factuur niet gevonden voor deze betaling" }, { status: 404 });
  }

  // Betaling succesvol
  if (payment.status === "paid") {
    // Idempotency: als factuur al betaald is, return OK
    if (invoice.status === "paid") {
      return NextResponse.json({ status: "already_paid", invoiceId: invoice.id });
    }

    await supabase
      .from("invoices")
      .update({
        status: "paid",
        payment_method: payment.method ?? "online",
      })
      .eq("id", invoice.id);

    return NextResponse.json({ status: "processed", invoiceId: invoice.id });
  }

  // Expired/failed/canceled: reset betaallink zodat een nieuwe kan worden aangemaakt
  if (["expired", "failed", "canceled"].includes(payment.status)) {
    await supabase
      .from("invoices")
      .update({
        mollie_payment_id: null,
        payment_link: null,
      })
      .eq("id", invoice.id);

    return NextResponse.json({ status: "payment_reset", invoiceId: invoice.id, paymentStatus: payment.status });
  }

  // Overige statussen (open, pending, authorized)
  return NextResponse.json({ status: "ignored", paymentStatus: payment.status });
}
