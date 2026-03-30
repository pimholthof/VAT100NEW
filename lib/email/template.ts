import { formatCurrency, formatDateLong, escapeHtml } from "@/lib/format";
import type { InvoiceData } from "@/lib/types";

interface EmailTemplateOptions {
  /** Intro paragraph (already escaped) */
  introParagraph: string;
  /** Label for the amount row, e.g. "Totaal incl. BTW" or "Openstaand bedrag" */
  amountLabel: string;
  /** Extra HTML to inject before the closing text (e.g. IBAN block) */
  extraHtml?: string;
  /** Closing text before the signature */
  closingText?: string;
}

export function buildInvoiceEmailHtml(
  data: InvoiceData,
  options: EmailTemplateOptions
): string {
  const { invoice, client, profile } = data;
  const senderName = escapeHtml(profile.studio_name || profile.full_name);
  const recipientName = escapeHtml(client.contact_name || client.name);
  const invoiceNum = escapeHtml(invoice.invoice_number);

  const dueDateRow = invoice.due_date
    ? `<tr>
          <td style="padding:12px 0;font-size:14px;color:#808080;border-top:1px solid #F0F0F0;">Vervaldatum</td>
          <td style="padding:12px 0;font-size:14px;text-align:right;border-top:1px solid #F0F0F0;">${formatDateLong(invoice.due_date)}</td>
        </tr>`
    : "";

  return `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#000000;background:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <tr><td>
      <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">
        Beste ${recipientName},
      </p>
      <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">
        ${options.introParagraph}
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-top:1px solid #E0E0E0;border-bottom:1px solid #E0E0E0;">
        <tr>
          <td style="padding:12px 0;font-size:14px;color:#808080;">Factuurnummer</td>
          <td style="padding:12px 0;font-size:14px;text-align:right;">${invoiceNum}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;font-size:14px;color:#808080;border-top:1px solid #F0F0F0;">Factuurdatum</td>
          <td style="padding:12px 0;font-size:14px;text-align:right;border-top:1px solid #F0F0F0;">${formatDateLong(invoice.issue_date)}</td>
        </tr>
        ${dueDateRow}
        <tr>
          <td style="padding:12px 0;font-size:14px;color:#808080;border-top:1px solid #F0F0F0;">${escapeHtml(options.amountLabel)}</td>
          <td style="padding:12px 0;font-size:16px;font-weight:bold;text-align:right;border-top:1px solid #F0F0F0;">${formatCurrency(invoice.total_inc_vat)}</td>
        </tr>
      </table>
      ${options.extraHtml ?? ""}
      ${options.closingText ? `<p style="font-size:16px;line-height:1.6;margin:0 0 24px;">${options.closingText}</p>` : ""}
      <p style="font-size:16px;line-height:1.6;margin:0 0 32px;">
        Zie bijlage voor de volledige factuur.
      </p>
      <p style="font-size:14px;line-height:1.6;margin:0;color:#808080;">
        Met vriendelijke groet,<br>${senderName}
      </p>
    </td></tr>
  </table>
</body>
</html>`.trim();
}
