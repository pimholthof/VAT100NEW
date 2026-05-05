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

export async function sendWelcomeEmail(options: {
  email: string;
  fullName: string;
  tempPassword?: string;
  studioName?: string;
  unsubscribeToken?: string;
}): Promise<ActionResult> {
  const { email, fullName, tempPassword, studioName } = options;
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vat100.nl'}/login`;

  const contentHtml = `
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Welkom bij VAT100, ${fullName}.</p>

    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#333;">
      Je account voor ${studioName ? `<strong>${studioName}</strong>` : 'je studio'} staat klaar.
    </p>

    <div style="background:#FAFAFA;padding:24px;border:1px solid #E0E0E0;margin-bottom:32px;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.5;">Inloggegevens</p>
      <p style="margin:0 0 ${tempPassword ? '12px' : '0'};font-size:14px;">E-mail: <strong>${email}</strong></p>
      ${tempPassword ? `<p style="margin:0;font-size:14px;">Tijdelijk wachtwoord: <strong>${tempPassword}</strong></p>` : ''}
    </div>

    <p style="margin:0 0 16px;font-size:13px;line-height:1.7;color:#666;">Eerste stappen:</p>
    <ul style="margin:0 0 32px;padding-left:20px;font-size:13px;line-height:1.8;color:#333;">
      <li>Maak je eerste factuur in minder dan 30 seconden.</li>
      <li>Scan je eerste bon — de AI classificeert hem voor je.</li>
      <li>Bekijk je BTW-overzicht voor het lopende kwartaal.</li>
    </ul>

    ${tempPassword ? '<p style="font-size:13px;opacity:0.55;">Verander je wachtwoord direct na de eerste keer inloggen bij je instellingen.</p>' : ''}
  `;

  try {
    const { error: sendError } = await getResend().emails.send({
      from: process.env.EMAIL_FROM || "welkom@vat100.nl",
      to: email,
      subject: `Welkom bij VAT100${studioName ? ` — ${studioName}` : ''}`,
      html: buildBaseEmailHtml({
        title: "Welkom bij VAT100",
        contentHtml,
        cta: { label: "Open VAT100", url: loginUrl },
        unsubscribeToken: options.unsubscribeToken,
      }),
    });

    if (sendError) {
      console.error("[Email] Error sending welcome email:", sendError);
      return { error: sendError.message };
    }

    return { error: null };
  } catch (err: unknown) {
    console.error("[Email] Unexpected error:", err);
    return { error: (err as Error).message || "Onbekende fout bij verzenden e-mail." };
  }
}
