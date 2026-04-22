import { formatCurrency, escapeHtml } from "@/lib/format";
import type { InvoiceData } from "@/lib/types";

export interface EmailTemplateOptions {
  /** Intro paragraph (already escaped) */
  introParagraph: string;
  /** Label for the amount row, e.g. "Totaal incl. BTW" or "Openstaand bedrag" */
  amountLabel: string;
  /** Extra HTML to inject before the closing text (e.g. IBAN block) */
  extraHtml?: string;
  /** Closing text before the signature */
  closingText?: string;
}

export function buildBaseEmailHtml(options: {
  title: string;
  preheader?: string;
  contentHtml: string;
  cta?: { label: string; url: string };
  footerText?: string;
  unsubscribeToken?: string;
}): string {
  const ctaHtml = options.cta 
    ? `<div style="text-align:center;margin:40px 0;"><a href="${escapeHtml(options.cta.url)}" style="display:inline-block;background:#000000;color:#FFFFFF;padding:18px 36px;text-decoration:none;font-weight:900;font-size:14px;letter-spacing:0.1em;text-transform:uppercase;font-style:italic;">${escapeHtml(options.cta.label)}</a></div>`
    : "";

  return `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
</style>
</head>
<body style="margin:0;padding:0;font-family:'Inter',Arial,sans-serif;color:#000000;background:#FFFFFF;line-height:1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:60px 24px;">
    <tr><td>
      <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.3em;margin-bottom:40px;opacity:0.3;">VAT100 Founder Hub</div>
      <h1 style="font-size:42px;font-weight:900;line-height:1;margin:0 0 32px;font-style:italic;letter-spacing:-0.04em;text-transform:uppercase;">${options.title}</h1>
      <div style="font-size:16px;color:#000000;">
        ${options.contentHtml}
      </div>
      ${ctaHtml}
      <div style="margin-top:60px;padding-top:32px;border-top:1px solid #E0E0E0;">
        <p style="font-size:12px;color:#808080;margin:0;">
          ${options.footerText || "De premium standaard voor creatief boekhouden."}<br>
          © ${new Date().getFullYear()} VAT100 Project Management
        </p>
        ${options.unsubscribeToken ? `<p style="font-size:11px;color:#A0A0A0;margin:12px 0 0;"><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://vat100.nl"}/api/unsubscribe/${options.unsubscribeToken}" style="color:#A0A0A0;text-decoration:underline;">Emailvoorkeuren beheren</a></p>` : ""}
      </div>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

export function buildInvoiceEmailHtml(
  data: InvoiceData,
  options: EmailTemplateOptions
): string {
  const { invoice, client, profile } = data;
  // Escape user-generated names — these come from the DB and end up in raw
  // HTML. Invoice number is DB-generated and always safe but we escape
  // defense-in-depth. The caller is contractually responsible for escaping
  // introParagraph and extraHtml (see EmailTemplateOptions docs).
  const senderName = escapeHtml(profile.studio_name || profile.full_name);
  const recipientName = escapeHtml(client.contact_name || client.name);
  const invoiceNumber = escapeHtml(invoice.invoice_number);

  const contentHtml = `
    <p style="margin-bottom:24px;">Beste ${recipientName},</p>
    <p style="margin-bottom:32px;">${options.introParagraph}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border-top:1px solid #E0E0E0;border-bottom:1px solid #E0E0E0;">
      <tr><td style="padding:12px 0;font-size:14px;color:#808080;">Factuur</td><td style="padding:12px 0;font-size:14px;text-align:right;font-weight:bold;">${invoiceNumber}</td></tr>
      <tr><td style="padding:12px 0;font-size:14px;color:#808080;border-top:1px solid #F0F0F0;">Totaal</td><td style="padding:12px 0;font-size:18px;text-align:right;font-weight:900;">${formatCurrency(invoice.total_inc_vat)}</td></tr>
    </table>
    ${options.extraHtml ?? ""}
    <p style="font-size:14px;opacity:0.6;margin-bottom:24px;">Zie bijlage voor de volledige factuur.</p>
  `;

  return buildBaseEmailHtml({
    title: "Factuur",
    contentHtml,
    footerText: `Verzonden door ${senderName}`,
  });
}
