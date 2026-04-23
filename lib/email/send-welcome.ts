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

/**
 * Welkomstmail na eerste geslaagde betaling. Bevat de persoonlijke
 * referral-code — growth-loop: elke nieuwe betalende klant wordt zelf
 * een groeikanaal.
 */
export async function sendWelcomeEmail(options: {
  email: string;
  fullName: string;
  planName: string;
  referralCode: string;
}): Promise<ActionResult> {
  const { email, fullName, planName, referralCode } = options;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vat100.nl";
  const shareUrl = `${appUrl}/?r=${referralCode}`;

  const contentHtml = `
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Welkom bij VAT100, ${fullName}.</p>

    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#333;">
      Je ${planName}-abonnement staat klaar. Vanaf nu houdt VAT100 realtime bij
      wat je moet reserveren voor BTW en belasting, zodat je precies weet wat
      je vrij kunt besteden.
    </p>

    <div style="padding:24px;border:1px solid #E0E0E0;background:#FAFAFA;margin:32px 0;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.5;">
        Verdien maanden gratis
      </p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#333;">
        Stuur je persoonlijke link naar een andere ZZP&apos;er. Zodra ze hun
        eerste betaling doen, krijgen jullie allebei één maand gratis.
      </p>
      <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.5;">
        Jouw code
      </p>
      <p style="margin:0 0 16px;font-size:22px;font-weight:700;letter-spacing:-0.02em;font-family:ui-monospace,monospace;">
        ${referralCode}
      </p>
      <p style="margin:0;font-size:13px;word-break:break-all;">
        <a href="${shareUrl}" style="color:#000;text-decoration:underline;">${shareUrl}</a>
      </p>
    </div>

    <p style="margin:32px 0 0;font-size:13px;line-height:1.6;color:#666;">
      Eerste stappen:<br>
      · Voeg je bankrekening toe voor automatische reconciliatie<br>
      · Upload je eerste bon — de AI classificeert hem voor je<br>
      · Stuur een factuur in minder dan 30 seconden
    </p>

    <p style="margin:32px 0 0;">
      <a href="${appUrl}/dashboard" style="display:inline-block;background:#000;color:#fff;padding:14px 28px;text-decoration:none;font-size:12px;font-weight:500;letter-spacing:0.10em;text-transform:uppercase;">
        Open VAT100 →
      </a>
    </p>
  `;

  const html = buildBaseEmailHtml({
    preheader: `Welkom bij VAT100 — jouw referral-code: ${referralCode}`,
    title: "Welkom bij VAT100",
    contentHtml,
  });

  const { error } = await getResend().emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "Welkom bij VAT100",
    html,
  });

  if (error) return { error: error.message };
  return { error: null };
}
