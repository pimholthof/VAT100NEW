import { Resend } from "resend";
import { buildBaseEmailHtml } from "./template";
import { formatCurrency, escapeHtml } from "@/lib/format";
import type { ActionResult } from "@/lib/types";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export interface SendQuoteEmailOptions {
  quoteNumber: string;
  quoteId: string;
  clientEmail: string;
  clientName: string;
  senderName: string;
  totalIncVat: number;
  validUntil: string;
  notes?: string | null;
  shareToken?: string | null;
}

export async function sendQuoteEmail(options: SendQuoteEmailOptions): Promise<ActionResult> {
  const {
    quoteNumber,
    quoteId,
    clientEmail,
    clientName,
    senderName,
    totalIncVat,
    validUntil,
    notes,
    shareToken,
  } = options;

  const validUntilFormatted = new Date(validUntil).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const viewUrl = shareToken
    ? `${process.env.NEXT_PUBLIC_APP_URL || "https://vat100.nl"}/quote/${shareToken}`
    : `${process.env.NEXT_PUBLIC_APP_URL || "https://vat100.nl"}/dashboard/quotes/${quoteId}`;

  const notesHtml = notes
    ? `<p style="font-size:14px;line-height:1.6;margin:0 0 24px;color:#666;font-style:italic;">${escapeHtml(notes).replace(/\n/g, "<br>")}</p>`
    : "";

  const contentHtml = `
    <p style="margin-bottom:24px;">Beste ${escapeHtml(clientName)},</p>
    <p style="margin-bottom:32px;">Hierbij ontvangt u offerte <strong>${escapeHtml(quoteNumber)}</strong> van ${escapeHtml(senderName)}.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border-top:1px solid #E0E0E0;border-bottom:1px solid #E0E0E0;">
      <tr><td style="padding:12px 0;font-size:14px;color:#808080;">Offerte</td><td style="padding:12px 0;font-size:14px;text-align:right;font-weight:bold;">${escapeHtml(quoteNumber)}</td></tr>
      <tr><td style="padding:12px 0;font-size:14px;color:#808080;border-top:1px solid #F0F0F0;">Totaal incl. BTW</td><td style="padding:12px 0;font-size:18px;text-align:right;font-weight:900;">${formatCurrency(totalIncVat)}</td></tr>
      <tr><td style="padding:12px 0;font-size:14px;color:#808080;border-top:1px solid #F0F0F0;">Geldig tot</td><td style="padding:12px 0;font-size:14px;text-align:right;">${validUntilFormatted}</td></tr>
    </table>
    ${notesHtml}
    <p style="font-size:14px;opacity:0.6;">U kunt de offerte bekijken via de knop hieronder.</p>
  `;

  try {
    const { error: sendError } = await getResend().emails.send({
      from: process.env.EMAIL_FROM!,
      to: clientEmail,
      subject: `Offerte ${escapeHtml(quoteNumber)} — ${escapeHtml(senderName)}`,
      html: buildBaseEmailHtml({
        title: "Offerte",
        contentHtml,
        cta: { label: "Bekijk Offerte", url: viewUrl },
        footerText: `Verzonden door ${escapeHtml(senderName)}`,
      }),
    });

    if (sendError) return { error: sendError.message };
    return { error: null };
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}
