import { Resend } from "resend";
import { buildBaseEmailHtml } from "./template";
import { formatCurrency } from "@/lib/format";
import type { ActionResult } from "@/lib/types";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

/**
 * Send a subscription payment receipt/invoice to the customer.
 * Triggered automatically when a recurring Mollie payment succeeds.
 */
export async function sendSubscriptionReceipt(options: {
  email: string;
  fullName: string;
  planName: string;
  amountCents: number;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  paidAt: string;
}): Promise<ActionResult> {
  const { email, fullName, planName, amountCents, invoiceNumber, periodStart, periodEnd, paidAt } = options;

  const amount = formatCurrency(amountCents / 100);
  const fmtDate = (d: string) =>
    new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d));

  const contentHtml = `
    <p style="margin-bottom:24px;">Beste ${fullName},</p>
    <p style="margin-bottom:32px;">Bedankt voor je betaling. Hieronder vind je het ontvangstbewijs voor je VAT100-abonnement.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border-top:1px solid #E0E0E0;border-bottom:1px solid #E0E0E0;">
      <tr>
        <td style="padding:12px 0;font-size:14px;color:#808080;">Factuurnummer</td>
        <td style="padding:12px 0;font-size:14px;text-align:right;font-weight:bold;">${invoiceNumber}</td>
      </tr>
      <tr>
        <td style="padding:12px 0;font-size:14px;color:#808080;border-top:1px solid #F0F0F0;">Plan</td>
        <td style="padding:12px 0;font-size:14px;text-align:right;font-weight:bold;">${planName}</td>
      </tr>
      <tr>
        <td style="padding:12px 0;font-size:14px;color:#808080;border-top:1px solid #F0F0F0;">Periode</td>
        <td style="padding:12px 0;font-size:14px;text-align:right;">${fmtDate(periodStart)} — ${fmtDate(periodEnd)}</td>
      </tr>
      <tr>
        <td style="padding:12px 0;font-size:14px;color:#808080;border-top:1px solid #F0F0F0;">Betaald op</td>
        <td style="padding:12px 0;font-size:14px;text-align:right;">${fmtDate(paidAt)}</td>
      </tr>
      <tr>
        <td style="padding:12px 0;font-size:14px;color:#808080;border-top:1px solid #F0F0F0;">Bedrag (incl. BTW)</td>
        <td style="padding:12px 0;font-size:18px;text-align:right;font-weight:900;">${amount}</td>
      </tr>
    </table>

    <p style="font-size:14px;opacity:0.6;margin-bottom:24px;">
      Dit ontvangstbewijs kun je gebruiken voor je administratie. Bewaar dit e-mail als factuur.
    </p>
  `;

  try {
    const { error: sendError } = await getResend().emails.send({
      from: process.env.EMAIL_FROM || "billing@vat100.nl",
      to: email,
      subject: `Ontvangstbewijs VAT100 — ${invoiceNumber}`,
      html: buildBaseEmailHtml({
        title: "Betaling ontvangen",
        contentHtml,
        cta: { label: "Open dashboard", url: `${process.env.NEXT_PUBLIC_APP_URL || "https://vat100.nl"}/dashboard` },
        footerText: "Automatisch gegenereerd door VAT100.",
      }),
    });

    if (sendError) return { error: sendError.message };
    return { error: null };
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}

/**
 * Escalating subscription payment reminder emails.
 * Step 1: Friendly reminder (after 3 days past_due)
 * Step 2: Formal demand (after 7 days)
 * Step 3: Final warning with cancellation threat (after 14 days)
 */
export async function sendSubscriptionReminder(options: {
  email: string;
  fullName: string;
  planName: string;
  amount: string;
  step: number;
}): Promise<ActionResult> {
  const { email, fullName, planName, amount, step } = options;
  const billingUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://vat100.nl"}/dashboard/settings/subscription`;

  const templates: Record<number, { subject: string; body: string; closing: string }> = {
    1: {
      subject: `Herinnering: Betaling mislukt voor je VAT100 ${planName}-abonnement`,
      body: `<p style="margin-bottom:24px;">De automatische incasso voor je VAT100-abonnement (<strong>${amount}</strong>) is helaas niet gelukt.</p>
             <p style="margin-bottom:32px;">Werk je betaalgegevens bij via het dashboard om je abonnement actief te houden.</p>`,
      closing: "Mocht de betaling al gelukt zijn, dan kun je deze e-mail negeren.",
    },
    2: {
      subject: `Aanmaning: Openstaande betaling VAT100 — ${amount}`,
      body: `<p style="margin-bottom:24px;">Ondanks onze eerdere herinnering staat er nog een openstaande betaling van <strong>${amount}</strong> voor je <strong>${planName}</strong>-abonnement.</p>
             <p style="margin-bottom:32px;color:#D0021B;font-weight:bold;">Als de betaling niet binnen 7 dagen wordt voldaan, wordt je account beperkt en verlies je toegang tot premium functies.</p>`,
      closing: "Neem contact met ons op als je vragen hebt over deze betaling.",
    },
    3: {
      subject: `Laatste waarschuwing: VAT100-abonnement wordt opgezegd`,
      body: `<p style="margin-bottom:24px;">Dit is de laatste waarschuwing met betrekking tot je openstaande betaling van <strong>${amount}</strong>.</p>
             <p style="margin-bottom:32px;color:#D0021B;font-weight:bold;">Zonder betaling binnen 5 werkdagen wordt je abonnement definitief opgezegd. Je verliest dan toegang tot al je data, facturen en rapportages.</p>`,
      closing: "Dit is de laatste herinnering die je ontvangt voordat je account wordt gedeactiveerd.",
    },
  };

  const template = templates[step] ?? templates[1];

  const contentHtml = `
    <p style="margin-bottom:24px;">Beste ${fullName},</p>
    ${template.body}
    <p style="font-size:14px;opacity:0.6;margin-bottom:24px;">${template.closing}</p>
  `;

  try {
    const { error: sendError } = await getResend().emails.send({
      from: process.env.EMAIL_FROM || "billing@vat100.nl",
      to: email,
      subject: template.subject,
      html: buildBaseEmailHtml({
        title: step >= 3 ? "Laatste waarschuwing" : step >= 2 ? "Aanmaning" : "Betaalherinnering",
        contentHtml,
        cta: { label: "Nu betalen", url: billingUrl },
      }),
    });

    if (sendError) return { error: sendError.message };
    return { error: null };
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}
