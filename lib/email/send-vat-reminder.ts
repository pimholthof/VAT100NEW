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

const DEADLINE_MAP: Record<number, string> = {
  1: "30 april",
  2: "31 juli",
  3: "31 oktober",
  4: "31 januari",
};

export async function sendVatReminder(options: {
  email: string;
  fullName: string;
  quarter: number;
  year: number;
  netVat: number;
}): Promise<ActionResult> {
  const { email, fullName, quarter, year, netVat } = options;
  const deadline = DEADLINE_MAP[quarter] ?? "binnenkort";
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://vat100.nl"}/dashboard/tax`;

  const contentHtml = `
    <p style="margin-bottom:24px;">Beste ${fullName},</p>
    <p style="margin-bottom:24px;">Je BTW-aangifte voor <strong>Q${quarter} ${year}</strong> is automatisch voorbereid. Hieronder een samenvatting:</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border-top:2px solid #000000;">
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #E0E0E0;">
          <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;opacity:0.4;">Periode</div>
          <div style="font-size:18px;font-weight:700;">Q${quarter} ${year}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #E0E0E0;">
          <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;opacity:0.4;">Af te dragen BTW</div>
          <div style="font-size:24px;font-weight:900;">${formatCurrency(netVat)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #E0E0E0;">
          <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;opacity:0.4;">Deadline</div>
          <div style="font-size:18px;font-weight:700;">${deadline} ${quarter === 4 ? year + 1 : year}</div>
        </td>
      </tr>
    </table>

    <p style="font-size:14px;opacity:0.6;">Controleer je aangifte in het dashboard en dien deze in bij de Belastingdienst voor de deadline.</p>
  `;

  try {
    const { error: sendError } = await getResend().emails.send({
      from: process.env.EMAIL_FROM || "belasting@vat100.nl",
      to: email,
      subject: `BTW-aangifte Q${quarter} ${year} — Concept gereed`,
      html: buildBaseEmailHtml({
        title: "BTW-aangifte Voorbereiding",
        contentHtml,
        cta: { label: "Bekijk Aangifte", url: dashboardUrl },
        footerText: "Automatisch voorbereid door VAT100.",
      }),
    });

    if (sendError) return { error: sendError.message };
    return { error: null };
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}
