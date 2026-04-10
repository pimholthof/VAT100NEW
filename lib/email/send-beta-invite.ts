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

export async function sendBetaInviteEmail(options: {
  email: string;
  fullName: string;
  planName: string;
  registrationUrl: string;
  unsubscribeToken?: string;
}): Promise<ActionResult> {
  const { email, fullName, planName, registrationUrl } = options;

  const contentHtml = `
    <p style="margin-bottom:24px;">Beste ${fullName},</p>
    <p style="margin-bottom:24px;">Je bent geselecteerd voor de beta van <strong>VAT100</strong>. Van alle aanmeldingen ben jij uitgekozen om als een van de eersten toegang te krijgen.</p>
    <p style="margin-bottom:24px;">Je plan: <strong>${planName}</strong></p>

    <div style="background:#F5F5F5;padding:24px;border-left:4px solid #000000;margin-bottom:32px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:bold;text-transform:uppercase;opacity:0.4;">Wat betekent beta?</p>
      <p style="margin:0;font-size:14px;line-height:1.7;">Je krijgt vroege toegang tot het volledige platform. We waarderen je feedback enorm — het helpt ons VAT100 beter te maken. Houd er rekening mee dat sommige onderdelen nog niet helemaal af zijn.</p>
    </div>

    <p style="margin-bottom:16px;font-weight:bold;">Dit krijg je als beta-gebruiker:</p>
    <ul style="margin-bottom:32px;padding-left:20px;">
      <li style="margin-bottom:12px;"><strong>Facturering</strong> — professionele facturen in seconden.</li>
      <li style="margin-bottom:12px;"><strong>BTW-overzicht</strong> — altijd inzicht in je BTW-positie.</li>
      <li><strong>Cashflow-inzicht</strong> — weet precies waar je financieel staat.</li>
    </ul>
  `;

  try {
    const { error: sendError } = await getResend().emails.send({
      from: process.env.EMAIL_FROM || "beta@vat100.nl",
      to: email,
      subject: `VAT100 Beta — Je bent uitgenodigd, ${fullName}`,
      html: buildBaseEmailHtml({
        title: "Je bent uitgenodigd",
        contentHtml,
        cta: { label: "Start met VAT100", url: registrationUrl },
        footerText: "Je bent geselecteerd als een van de eerste gebruikers.",
        unsubscribeToken: options.unsubscribeToken,
      }),
    });

    if (sendError) {
      console.error("[Email] Error sending beta invite email:", sendError);
      return { error: sendError.message };
    }

    return { error: null };
  } catch (err: unknown) {
    console.error("[Email] Unexpected error:", err);
    return { error: (err as Error).message || "Onbekende fout bij verzenden e-mail." };
  }
}
