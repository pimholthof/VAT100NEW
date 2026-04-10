/**
 * Cron Job Failure Alerting
 *
 * Stuurt een admin-alert via Resend wanneer een cron job faalt.
 * Logt tevens een system_event met type cron.failure.
 */

import { Resend } from "resend";
import * as Sentry from "@sentry/nextjs";
import { createServiceClient } from "@/lib/supabase/service";
import { buildBaseEmailHtml } from "@/lib/email/template";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL || process.env.EMAIL_FROM || "admin@vat100.nl";

/**
 * Stuur een alert bij een gefaalde cron job.
 * Non-blocking: fouten in het alerting-systeem zelf worden stil opgegeten.
 */
export async function alertCronFailure(
  jobName: string,
  error: unknown,
  metadata?: Record<string, unknown>
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // 1. Log naar system_events
  try {
    const supabase = createServiceClient();
    await supabase.from("system_events").insert({
      event_type: "cron.failure",
      payload: {
        job: jobName,
        error: errorMessage,
        stack: errorStack?.slice(0, 500),
        metadata,
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    // Zelfs het loggen kan falen bij DB-problemen
  }

  // 2. Sentry (altijd)
  Sentry.captureException(error, {
    tags: { area: "cron", job: jobName },
    extra: metadata,
  });

  // 3. Email alert naar admin
  try {
    const contentHtml = `
      <p style="margin-bottom:16px;color:#D0021B;font-weight:700;">Cron job gefaald</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-top:2px solid #D0021B;">
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #E0E0E0;">
            <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;opacity:0.4;">Job</div>
            <div style="font-size:16px;font-weight:700;">${jobName}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #E0E0E0;">
            <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;opacity:0.4;">Foutmelding</div>
            <div style="font-size:14px;font-family:monospace;word-break:break-all;">${errorMessage}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #E0E0E0;">
            <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;opacity:0.4;">Tijdstip</div>
            <div style="font-size:14px;">${new Date().toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}</div>
          </td>
        </tr>
        ${metadata ? `<tr>
          <td style="padding:12px 0;border-bottom:1px solid #E0E0E0;">
            <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;opacity:0.4;">Context</div>
            <div style="font-size:12px;font-family:monospace;word-break:break-all;">${JSON.stringify(metadata, null, 2)}</div>
          </td>
        </tr>` : ""}
      </table>
    `;

    await getResend().emails.send({
      from: process.env.EMAIL_FROM || "alerts@vat100.nl",
      to: ADMIN_EMAIL,
      subject: `[VAT100 ALERT] Cron job gefaald: ${jobName}`,
      html: buildBaseEmailHtml({
        title: "Systeem Alert",
        contentHtml,
        footerText: "Automatische alert van het VAT100 monitoringsysteem.",
      }),
    });
  } catch {
    // Email-fout is non-fatal — we hebben al Sentry
  }
}
