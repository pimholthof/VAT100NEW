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

export async function sendPaymentNudge(options: {
  email: string;
  leadId: string;
  planName: string;
}): Promise<ActionResult> {
  const { email, leadId, planName } = options;
  const checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vat100.nl'}/register/pay?id=${leadId}`;

  const contentHtml = `
    <p style="margin-bottom:24px;">We zien dat je interesse hebt in het <strong>${planName}</strong> plan van de VAT100 Founder Hub.</p>
    <p style="margin-bottom:24px;">Je staat op de drempel om de volledige controle over je studio-financiën over te nemen. We hebben alles voor je klaargezet, je hoeft alleen de laatste stap te zetten.</p>
    
    <p style="margin-bottom:32px;">Klik op de knop hieronder om je registratie veilig af te ronden.</p>
    
    <p style="font-size:14px;opacity:0.6;">Heb je hulp nodig of vriagen over het pakket? Reply direct op deze mail.</p>
  `;

  try {
    const { error: sendError } = await getResend().emails.send({
      from: process.env.EMAIL_FROM || "support@vat100.nl",
      to: email,
      subject: `Laatste stap: Activeer je Founder Hub account`,
      html: buildBaseEmailHtml({
        title: "Finish your launch",
        contentHtml,
        cta: { label: "Betaal & Activeer", url: checkoutUrl },
        footerText: "Je hebt nog 24 uur om je plek te verzilveren."
      }),
    });

    if (sendError) return { error: sendError.message };
    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function sendBillingAlert(options: {
  email: string;
  fullName: string;
  amount: string;
}): Promise<ActionResult> {
  const { email, fullName, amount } = options;
  const billingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vat100.nl'}/dashboard/subscription`;

  const contentHtml = `
    <p style="margin-bottom:24px;">Beste ${fullName},</p>
    <p style="margin-bottom:24px;">De automatische incasso voor je VAT100 abonnement (<strong>${amount}</strong>) is helaas niet gelukt.</p>
    <p style="margin-bottom:32px;color:#D0021B;font-weight:bold;">Om onderbreking van je dienstverlening en AI-insights te voorkomen, vragen we je om de betaling handmatig uit te voeren via je dashboard.</p>
  `;

  try {
    const { error: sendError } = await getResend().emails.send({
      from: process.env.EMAIL_FROM || "billing@vat100.nl",
      to: email,
      subject: `Actie vereist: Mislukte betaling VAT100`,
      html: buildBaseEmailHtml({
        title: "Billing Alert",
        contentHtml,
        cta: { label: "Nu betalen", url: billingUrl },
        footerText: "Houd je accounts pro-actief."
      }),
    });

    if (sendError) return { error: sendError.message };
    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}
