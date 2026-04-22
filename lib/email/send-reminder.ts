import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { InvoicePDF } from "@/features/invoices/components/InvoicePDF";
import type { InvoiceData } from "@/lib/types";
import { escapeHtml } from "@/lib/format";
import { buildInvoiceEmailHtml } from "./template";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

/**
 * Escalation step templates for payment reminders.
 * Step 1: Friendly reminder
 * Step 2: Formal demand (aanmaning)
 * Step 3: Final warning / collection threat (incasso)
 */
function getReminderTemplate(step: number, invoiceNum: string, senderName: string): {
  subject: string;
  intro: string;
  closing: string;
} {
  switch (step) {
    case 2:
      return {
        subject: `Aanmaning: Factuur ${invoiceNum} — ${senderName}`,
        intro: `Ondanks eerdere herinnering(en) staat factuur <strong>${invoiceNum}</strong> nog steeds open. Wij verzoeken u dringend het openstaande bedrag binnen 7 dagen te voldoen.`,
        closing: "Bij uitblijven van betaling behouden wij ons het recht voor om incassomaatregelen te treffen, waarbij eventuele bijkomende kosten voor uw rekening komen.",
      };
    case 3:
      return {
        subject: `Laatste waarschuwing: Factuur ${invoiceNum} — ${senderName}`,
        intro: `Dit is de laatste waarschuwing betreffende factuur <strong>${invoiceNum}</strong>. Wij hebben eerder meerdere herinneringen verzonden zonder resultaat.`,
        closing: "Indien het volledige bedrag niet binnen 5 werkdagen op onze rekening staat, zullen wij de vordering overdragen aan een incassobureau. Alle bijkomende kosten (incassokosten, rente, administratiekosten) komen voor uw rekening.",
      };
    default:
      return {
        subject: `Herinnering: Factuur ${invoiceNum} — ${senderName}`,
        intro: `Graag herinneren wij u aan de openstaande factuur <strong>${invoiceNum}</strong>.`,
        closing: "Mocht u deze factuur reeds betaald hebben, dan kunt u deze herinnering als niet verzonden beschouwen.",
      };
  }
}

export async function sendReminderEmail(
  data: InvoiceData,
  customMessage?: string,
  step: number = 1
): Promise<{ error: string | null }> {
  const { invoice, client, profile } = data;

  if (!client.email) {
    return { error: "Klant heeft geen e-mailadres." };
  }

  const senderName = escapeHtml(profile.studio_name || profile.full_name);

  let pdfBuffer: Buffer;
  try {
    const element = createElement(InvoicePDF, { data });
    pdfBuffer = await renderToBuffer(
      element as unknown as Parameters<typeof renderToBuffer>[0]
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `Kon herinnering-PDF niet genereren: ${msg}` };
  }

  const filename = `factuur-${invoice.invoice_number}.pdf`;
  const invoiceNum = escapeHtml(invoice.invoice_number);

  const ibanHtml = profile.iban
    ? `<p style="font-size:14px;line-height:1.6;margin:0 0 24px;color:#666;">
        U kunt het bedrag overmaken naar:<br>
        <strong>IBAN:</strong> ${escapeHtml(profile.iban)}${profile.bic ? `<br><strong>BIC:</strong> ${escapeHtml(profile.bic)}` : ""}<br>
        <strong>t.n.v.:</strong> ${senderName}<br>
        <strong>o.v.v.:</strong> Factuur ${invoiceNum}
      </p>`
    : undefined;

  const template = getReminderTemplate(step, invoiceNum, senderName);

  const htmlBody = buildInvoiceEmailHtml(data, {
    introParagraph: customMessage
      ? escapeHtml(customMessage).replace(/\n/g, "<br>")
      : template.intro,
    amountLabel: "Openstaand bedrag",
    extraHtml: ibanHtml,
    closingText: template.closing,
  });

  const { error: sendError } = await getResend().emails.send({
    from: process.env.EMAIL_FROM!,
    to: client.email,
    subject: template.subject,
    html: htmlBody,
    attachments: [
      {
        filename,
        content: Buffer.from(pdfBuffer),
      },
    ],
  });

  if (sendError) {
    return { error: sendError.message };
  }

  return { error: null };
}
