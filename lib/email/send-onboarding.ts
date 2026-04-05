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
    <p style="margin-bottom:24px;">Welkom bij het elite-netwerk van VAT100, <strong>${fullName}</strong>.</p>
    <p style="margin-bottom:24px;">Je account voor <strong>${studioName || 'je studio'}</strong> is zojuist geactiveerd op de Founder Hub. Vanaf nu heb je de volledige controle over je financiële koers.</p>
    
    <div style="background:#F5F5F5;padding:24px;border-left:4px solid #000000;margin-bottom:32px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:bold;text-transform:uppercase;opacity:0.4;">Inloggegevens</p>
      <p style="margin:0 0 12px;font-size:16px;">Email: <strong>${email}</strong></p>
      ${tempPassword ? `<p style="margin:0;font-size:16px;">Tijdelijk wachtwoord: <strong>${tempPassword}</strong></p>` : ''}
    </div>

    <p style="margin-bottom:24px;">Wat is je volgende zet?</p>
    <ul style="margin-bottom:32px;padding-left:20px;">
      <li style="margin-bottom:12px;"><strong>Stel je bankkoppeling in</strong> voor real-time inzicht.</li>
      <li style="margin-bottom:12px;"><strong>Upload je eerste factuur</strong> en ervaar de snelheid.</li>
      <li><strong>Check je Radar</strong> voor je fiscale gezondheid.</li>
    </ul>
    
    <p style="font-size:14px;opacity:0.6;">Verander je wachtwoord direct na de eerste keer inloggen bij je instellingen.</p>
  `;

  try {
    const { error: sendError } = await getResend().emails.send({
      from: process.env.EMAIL_FROM || "welkom@vat100.nl",
      to: email,
      subject: `Welkom bij de Founder Hub — ${studioName || 'VAT100'}`,
      html: buildBaseEmailHtml({
        title: "Welcome aboard",
        contentHtml,
        cta: { label: "Naar de Hub", url: loginUrl },
        footerText: "Je bent nu onderdeel van de 100.",
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
