import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { InvoicePDF } from "@/components/invoice/InvoicePDF";
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

export async function sendReminderEmail(
  data: InvoiceData
): Promise<{ error: string | null }> {
  const { invoice, client, profile } = data;

  if (!client.email) {
    return { error: "Klant heeft geen e-mailadres." };
  }

  const senderName = escapeHtml(profile.studio_name || profile.full_name);

  // Generate PDF buffer
  const element = createElement(InvoicePDF, { data });
  const pdfBuffer = await renderToBuffer(
    element as unknown as Parameters<typeof renderToBuffer>[0]
  );

  const filename = `factuur-${invoice.invoice_number}.pdf`;
  const invoiceNum = escapeHtml(invoice.invoice_number);

  // Build IBAN block if available
  const ibanHtml = profile.iban
    ? `<p style="font-size:14px;line-height:1.6;margin:0 0 24px;color:#666;">
        U kunt het bedrag overmaken naar:<br>
        <strong>IBAN:</strong> ${escapeHtml(profile.iban)}${profile.bic ? `<br><strong>BIC:</strong> ${escapeHtml(profile.bic)}` : ""}<br>
        <strong>t.n.v.:</strong> ${senderName}<br>
        <strong>o.v.v.:</strong> Factuur ${invoiceNum}
      </p>`
    : undefined;

  const htmlBody = buildInvoiceEmailHtml(data, {
    introParagraph: `Graag herinneren wij u aan de openstaande factuur <strong>${invoiceNum}</strong>.`,
    amountLabel: "Openstaand bedrag",
    extraHtml: ibanHtml,
    closingText:
      "Mocht u deze factuur reeds betaald hebben, dan kunt u deze herinnering als niet verzonden beschouwen.",
  });

  const { error: sendError } = await getResend().emails.send({
    from: process.env.EMAIL_FROM!,
    to: client.email,
    subject: `Herinnering: Factuur ${invoice.invoice_number} — ${profile.studio_name || profile.full_name}`,
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
