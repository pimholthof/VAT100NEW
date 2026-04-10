import { Resend } from "resend";
import { buildBaseEmailHtml } from "./template";
import { formatCurrency } from "@/lib/format";
import { calculateLegalInterest } from "@/lib/logic/interest-calculator";
import type { ActionResult, InvoiceData } from "@/lib/types";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

/**
 * Verstuur een formele ingebrekestelling na 3 herinneringen.
 * Dit is de laatste stap voor eventuele incasso.
 */
export async function sendDefaultNotice(
  invoiceData: InvoiceData
): Promise<ActionResult> {
  const { invoice, client, profile } = invoiceData;

  if (!client.email) {
    return { error: "Klant heeft geen e-mailadres." };
  }

  const dueDate = invoice.due_date ?? invoice.issue_date;
  const { daysOverdue, interestAmount, totalOwed } = calculateLegalInterest(
    Number(invoice.total_inc_vat) || 0,
    dueDate
  );

  const senderName = profile.studio_name || profile.full_name || "Ondernemer";
  const today = new Date().toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const contentHtml = `
    <p style="margin-bottom:16px;">Geachte ${client.contact_name || client.name},</p>

    <p style="margin-bottom:16px;font-weight:700;color:#D0021B;">INGEBREKESTELLING</p>

    <p style="margin-bottom:16px;">
      Ondanks eerdere herinneringen hebben wij nog geen betaling ontvangen voor onderstaande factuur.
      Hierbij stellen wij u formeel in gebreke.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-top:2px solid #D0021B;">
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #E0E0E0;">
          <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;opacity:0.4;">Factuurnummer</div>
          <div style="font-size:16px;font-weight:700;">${invoice.invoice_number}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #E0E0E0;">
          <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;opacity:0.4;">Oorspronkelijk bedrag</div>
          <div style="font-size:16px;font-weight:700;">${formatCurrency(invoice.total_inc_vat)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #E0E0E0;">
          <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;opacity:0.4;">Vervaldatum</div>
          <div style="font-size:16px;">${new Date(dueDate).toLocaleDateString("nl-NL")}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #E0E0E0;">
          <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;opacity:0.4;">Dagen te laat</div>
          <div style="font-size:16px;color:#D0021B;font-weight:700;">${daysOverdue} dagen</div>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #E0E0E0;">
          <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;opacity:0.4;">Wettelijke rente (10,5% per jaar)</div>
          <div style="font-size:16px;">${formatCurrency(interestAmount)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:2px solid #D0021B;">
          <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;opacity:0.4;">Totaal verschuldigd</div>
          <div style="font-size:24px;font-weight:900;color:#D0021B;">${formatCurrency(totalOwed)}</div>
        </td>
      </tr>
    </table>

    <p style="margin-bottom:16px;">
      Wij verzoeken u het totaalbedrag van <strong>${formatCurrency(totalOwed)}</strong> binnen
      <strong>14 dagen</strong> na dagtekening van deze ingebrekestelling te voldoen.
    </p>

    <p style="margin-bottom:16px;">
      Indien betaling uitblijft, zijn wij genoodzaakt de vordering uit handen te geven aan een
      incassobureau. De bijkomende kosten hiervan komen voor uw rekening.
    </p>

    <p style="font-size:14px;opacity:0.6;">
      ${senderName}<br/>
      ${today}
    </p>
  `;

  try {
    const { error: sendError } = await getResend().emails.send({
      from: process.env.EMAIL_FROM || "facturen@vat100.nl",
      to: client.email,
      subject: `INGEBREKESTELLING — Factuur ${invoice.invoice_number}`,
      html: buildBaseEmailHtml({
        title: "Ingebrekestelling",
        contentHtml,
        footerText: `Verstuurd namens ${senderName} via VAT100.`,
      }),
    });

    if (sendError) return { error: sendError.message };
    return { error: null };
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}
