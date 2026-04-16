/**
 * Webhook Retry Processor
 *
 * Verwerkt gefaalde webhook-events opnieuw met exponential backoff.
 * Integreert in de bestaande agents/run-all cron.
 */

import * as Sentry from "@sentry/nextjs";
import { createServiceClient } from "@/lib/supabase/service";
import { getErrorMessage } from "@/lib/utils/errors";
import { getMolliePayment } from "@/lib/payments/mollie";
import { isRateLimited } from "@/lib/rate-limit";

interface RetryResult {
  processed: number;
  succeeded: number;
  failed: number;
  exhausted: number;
}

/**
 * Sla een gefaald webhook-event op in de retry queue.
 */
export async function queueWebhookRetry(
  source: string,
  payload: Record<string, unknown>,
  error: string
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("webhook_events").insert({
      source,
      payload,
      status: "pending",
      attempts: 1,
      last_error: error,
      next_retry_at: calculateNextRetry(1),
    });
  } catch {
    // Als zelfs de queue faalt, log naar Sentry
    Sentry.captureMessage(`Webhook queue insert failed: ${error}`, "error");
  }
}

/**
 * Bereken de volgende retry-tijd met exponential backoff.
 * Poging 1: 5 min, 2: 15 min, 3: 1 uur, 4: 4 uur, 5: 12 uur
 */
function calculateNextRetry(attempt: number): string {
  const delayMinutes = Math.min(5 * Math.pow(3, attempt - 1), 720);
  const next = new Date(Date.now() + delayMinutes * 60 * 1000);
  return next.toISOString();
}

/**
 * Verwerk alle uitstaande webhook retries.
 */
export async function processWebhookRetries(): Promise<RetryResult> {
  const result: RetryResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    exhausted: 0,
  };

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // Haal events op die klaar zijn voor retry
  const { data: events, error } = await supabase
    .from("webhook_events")
    .select("*")
    .eq("status", "pending")
    .lte("next_retry_at", now)
    .order("created_at", { ascending: true })
    .limit(20);

  if (error || !events || events.length === 0) return result;

  for (const event of events) {
    result.processed++;
    const newAttempt = (event.attempts ?? 0) + 1;

    try {
      // Markeer als processing
      await supabase
        .from("webhook_events")
        .update({ status: "processing", attempts: newAttempt })
        .eq("id", event.id);

      // Verwerk op basis van source
      if (event.source === "mollie") {
        await reprocessMollieWebhook(event.payload);
      }

      // Succes
      await supabase
        .from("webhook_events")
        .update({
          status: "completed",
          processed_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", event.id);

      result.succeeded++;
    } catch (e) {
      const errorMessage = getErrorMessage(e);
      const exhausted = newAttempt >= (event.max_attempts ?? 5);

      await supabase
        .from("webhook_events")
        .update({
          status: exhausted ? "failed" : "pending",
          last_error: errorMessage,
          next_retry_at: exhausted ? null : calculateNextRetry(newAttempt),
          failed_at: exhausted ? new Date().toISOString() : null,
        })
        .eq("id", event.id);

      if (exhausted) {
        result.exhausted++;
        Sentry.captureMessage(
          `Webhook retry exhausted after ${newAttempt} attempts: ${errorMessage}`,
          "error"
        );
        await alertAdminOnExhausted({
          source: event.source,
          eventId: event.id,
          attempts: newAttempt,
          error: errorMessage,
        });
      } else {
        result.failed++;
      }
    }
  }

  return result;
}

/**
 * Stuur een admin-alert wanneer een webhook-event definitief faalt.
 * Throttled (max 1 mail per uur per source) om mailbom te voorkomen.
 */
async function alertAdminOnExhausted(opts: {
  source: string;
  eventId: string;
  attempts: number;
  error: string;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;
  if (!adminEmail) return;

  // Max 1 alert per uur per source — ook bij stortvloed
  if (await isRateLimited(`dlq-alert:${opts.source}`, 1, 60 * 60_000)) {
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "alerts@vat100.nl",
      to: adminEmail,
      subject: `[VAT100] Webhook DLQ: ${opts.source} retry uitgeput`,
      text: [
        `Een webhook-event is na ${opts.attempts} pogingen definitief gefaald.`,
        ``,
        `Source: ${opts.source}`,
        `Event ID: ${opts.eventId}`,
        `Laatste fout: ${opts.error}`,
        ``,
        `Bekijk de Dead Letter Queue in /admin/systeem voor volledige payload en replay-actie.`,
        ``,
        `Throttle: max 1 alert per uur per source. Aanvullende failures worden alleen in Sentry vastgelegd.`,
      ].join("\n"),
    });
  } catch (e) {
    Sentry.captureMessage(
      `DLQ admin alert email failed: ${getErrorMessage(e)}`,
      "warning"
    );
  }
}

/**
 * Herverwerk een Mollie webhook payload.
 */
async function reprocessMollieWebhook(
  payload: Record<string, unknown>
): Promise<void> {
  const paymentId = payload.paymentId as string;
  if (!paymentId) throw new Error("Geen payment ID in payload");

  // Verifieer betaling via Mollie API
  const { data: payment, error } = await getMolliePayment(paymentId);
  if (error || !payment) {
    throw new Error(error ?? "Betaling niet gevonden bij Mollie");
  }

  // Alleen betaalde betalingen verwerken
  if (payment.status !== "paid") return;

  const supabase = createServiceClient();

  // Invoice payment
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("mollie_payment_id", paymentId)
    .maybeSingle();

  if (invoice && invoice.status !== "paid") {
    await supabase
      .from("invoices")
      .update({
        status: "paid",
        payment_method: payment.method ?? "online",
      })
      .eq("id", invoice.id);
  }
}
