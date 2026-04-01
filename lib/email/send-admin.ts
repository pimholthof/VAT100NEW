import { Resend } from "resend";
import { buildBaseEmailHtml } from "./template";
import type { ActionResult } from "@/lib/types";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendMonthlyAdminReport(options: {
  email: string;
  stats: {
    mrr: string;
    activeUsers: number;
    newLeads: number;
    atRiskAmount: string;
  };
}): Promise<ActionResult> {
  const { email, stats } = options;
  const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vat100.nl'}/admin`;

  const contentHtml = `
    <p style="margin-bottom:32px;">De Founder Hub heeft de balans opgemaakt. Hier is je strategische overzicht van de afgelopen periode.</p>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;border-top:2px solid #000000;">
      <tr>
        <td style="padding:20px 0;border-bottom:1px solid #E0E0E0;">
          <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;opacity:0.4;">Monthly Recurring Revenue</div>
          <div style="font-size:24px;font-weight:900;">${stats.mrr}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 0;border-bottom:1px solid #E0E0E0;">
          <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;opacity:0.4;">Actieve Gebruikers</div>
          <div style="font-size:24px;font-weight:900;">${stats.activeUsers}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 0;border-bottom:1px solid #E0E0E0;">
          <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;opacity:0.4;">Nieuwe Leads</div>
          <div style="font-size:24px;font-weight:900;">${stats.newLeads}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 0;border-bottom:1px solid #E0E0E0;">
          <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;opacity:0.4;color:#D0021B;">Revenue at Risk</div>
          <div style="font-size:24px;font-weight:900;color:#D0021B;">${stats.atRiskAmount}</div>
        </td>
      </tr>
    </table>

    <p style="font-size:14px;opacity:0.6;">Bekijk de volledige Pipeline en Retention Radar in de Admin Hub voor diepere inzichten.</p>
  `;

  try {
    const { error: sendError } = await getResend().emails.send({
      from: process.env.EMAIL_FROM || "reports@vat100.nl",
      to: email,
      subject: `Founder Hub Performance Report — ${new Date().toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}`,
      html: buildBaseEmailHtml({
        title: "Platform Intel",
        contentHtml,
        cta: { label: "Open Hub Radar", url: adminUrl },
        footerText: "Data-driven leadership voor VAT100."
      }),
    });

    if (sendError) return { error: sendError.message };
    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}
