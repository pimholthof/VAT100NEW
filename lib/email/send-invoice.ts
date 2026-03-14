import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { fetchInvoiceData } from "@/lib/invoice/fetch";
import { InvoicePDF } from "@/components/invoice/InvoicePDF";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function sendInvoiceEmail(
  invoiceId: string
): Promise<ActionResult> {
  const result = await fetchInvoiceData(invoiceId);
  if (result.error || !result.data) {
    return { error: result.error ?? "Kon factuurgegevens niet ophalen." };
  }
  const data = result.data;
  const { invoice, client, profile } = data;

  if (!client.email) {
    return { error: "Klant heeft geen e-mailadres." };
  }

  if (invoice.status === "draft") {
    return { error: "Conceptfacturen kunnen niet worden verzonden." };
  }

  // Generate PDF buffer
  const element = createElement(InvoicePDF, { data });
  const pdfBuffer = await renderToBuffer(
    element as unknown as Parameters<typeof renderToBuffer>[0]
  );

  const senderName = profile.studio_name || profile.full_name;
  const filename = `factuur-${invoice.invoice_number}.pdf`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#0D0D0B;background:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <tr><td>
      <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">
        Beste ${client.contact_name || client.name},
      </p>
      <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">
        Hierbij ontvangt u factuur <strong>${invoice.invoice_number}</strong> van ${senderName}.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-top:1px solid #E0E0E0;border-bottom:1px solid #E0E0E0;">
        <tr>
          <td style="padding:12px 0;font-size:14px;color:#666;">Factuurnummer</td>
          <td style="padding:12px 0;font-size:14px;text-align:right;">${invoice.invoice_number}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;font-size:14px;color:#666;border-top:1px solid #F0F0F0;">Factuurdatum</td>
          <td style="padding:12px 0;font-size:14px;text-align:right;border-top:1px solid #F0F0F0;">${formatDate(invoice.issue_date)}</td>
        </tr>
        ${invoice.due_date ? `<tr>
          <td style="padding:12px 0;font-size:14px;color:#666;border-top:1px solid #F0F0F0;">Vervaldatum</td>
          <td style="padding:12px 0;font-size:14px;text-align:right;border-top:1px solid #F0F0F0;">${formatDate(invoice.due_date)}</td>
        </tr>` : ""}
        <tr>
          <td style="padding:12px 0;font-size:14px;color:#666;border-top:1px solid #F0F0F0;">Totaal incl. BTW</td>
          <td style="padding:12px 0;font-size:16px;font-weight:bold;text-align:right;border-top:1px solid #F0F0F0;">${formatCurrency(invoice.total_inc_vat)}</td>
        </tr>
      </table>
      <p style="font-size:16px;line-height:1.6;margin:0 0 32px;">
        Zie bijlage voor de volledige factuur.
      </p>
      <p style="font-size:14px;line-height:1.6;margin:0;color:#666;">
        Met vriendelijke groet,<br>${senderName}
      </p>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const { error: sendError } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: client.email,
    subject: `Factuur ${invoice.invoice_number} — ${senderName}`,
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

  // Update sent_via
  const supabase = await createClient();
  const newSentVia =
    invoice.sent_via === "peppol" ? "both" : "email";

  await supabase
    .from("invoices")
    .update({ sent_via: newSentVia })
    .eq("id", invoiceId);

  return { error: null };
}
