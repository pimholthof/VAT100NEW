import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { fetchInvoiceData } from "@/lib/invoice/fetch";
import { InvoicePDF } from "@/features/invoices/components/InvoicePDF";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { escapeHtml } from "@/lib/format";
import { buildInvoiceEmailHtml } from "./template";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendInvoiceEmail(
  invoiceId: string
): Promise<ActionResult> {
  const result = await fetchInvoiceData(invoiceId);
  if (result.error || !result.data) {
    return { error: result.error ?? "Kon factuurgegevens niet ophalen." };
  }
  const data = result.data;
  const { invoice, client, profile } = data;

  if (!client.email) {
    return { error: "Klant heeft geen e-mailadres." };
  }

  if (invoice.status === "draft") {
    return { error: "Conceptfacturen kunnen niet worden verzonden." };
  }

  // Generate PDF buffer
  const element = createElement(InvoicePDF, { data });
  const pdfBuffer = await renderToBuffer(
    element as unknown as Parameters<typeof renderToBuffer>[0]
  );

  const senderName = escapeHtml(profile.studio_name || profile.full_name);
  const invoiceNum = escapeHtml(invoice.invoice_number);
  const filename = `factuur-${invoice.invoice_number}.pdf`;

  const notesHtml = invoice.notes
    ? `<p style="font-size:14px;line-height:1.6;margin:0 0 24px;color:#666;font-style:italic;">${escapeHtml(invoice.notes).replace(/\n/g, "<br>")}</p>`
    : undefined;

  const htmlBody = buildInvoiceEmailHtml(data, {
    introParagraph: `Hierbij ontvangt u factuur <strong>${invoiceNum}</strong> van ${senderName}.`,
    amountLabel: "Totaal incl. BTW",
    extraHtml: notesHtml,
  });

  const { error: sendError } = await getResend().emails.send({
    from: process.env.EMAIL_FROM!,
    to: client.email,
    subject: `Factuur ${invoice.invoice_number} — ${profile.studio_name || profile.full_name}`,
    html: htmlBody,
    attachments: [
      {
        filename,
        content: Buffer.from(pdfBuffer),
      },
    ],
  });

  if (sendError) {
    return { error: sendError.message };
  }

  // Update sent_via
  const supabase = await createClient();
  const newSentVia =
    invoice.sent_via === "peppol" ? "both" : "email";

  await supabase
    .from("invoices")
    .update({ sent_via: newSentVia })
    .eq("id", invoiceId);

  return { error: null };
}
