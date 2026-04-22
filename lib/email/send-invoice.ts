import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { fetchInvoiceData } from "@/lib/invoice/fetch";
import { InvoicePDF } from "@/features/invoices/components/InvoicePDF";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
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

  // White-label check: Plus-abonnees krijgen een onbranded PDF.
  const svc = createServiceClient();
  const { data: sub } = await svc
    .from("subscriptions")
    .select("plan_id")
    .eq("user_id", profile.id)
    .in("status", ["active", "past_due"])
    .maybeSingle();
  const branded = !(sub?.plan_id === "plus" || sub?.plan_id === "plus_yearly");

  // Generate PDF buffer
  const element = createElement(InvoicePDF, { data, branded });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(element as any);

  const senderName = escapeHtml(profile.studio_name || profile.full_name);
  const invoiceNum = escapeHtml(invoice.invoice_number);
  const filename = `factuur-${invoice.invoice_number}.pdf`;

  const notesHtml = invoice.notes
    ? `<p style="font-size:14px;line-height:1.6;margin:0 0 24px;color:#666;font-style:italic;">${escapeHtml(invoice.notes).replace(/\n/g, "<br>")}</p>`
    : undefined;

  const paymentLinkHtml = invoice.payment_link
    ? `<p style="text-align:center;margin:24px 0;"><a href="${escapeHtml(invoice.payment_link)}" style="display:inline-block;background:#A51C30;color:#FAF9F6;padding:14px 32px;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">Betaal nu online</a></p>`
    : undefined;

  const extraParts = [notesHtml, paymentLinkHtml].filter(Boolean).join("");

  const htmlBody = buildInvoiceEmailHtml(data, {
    introParagraph: `Hierbij ontvangt u factuur <strong>${invoiceNum}</strong> van ${senderName}.`,
    amountLabel: "Totaal incl. BTW",
    extraHtml: extraParts || undefined,
  });

  const { error: sendError } = await getResend().emails.send({
    from: process.env.EMAIL_FROM!,
    to: client.email,
    subject: `Factuur ${invoice.invoice_number} — ${profile.studio_name || profile.full_name}`,
    html: htmlBody,
    attachments: [
      {
        filename,
        content: pdfBuffer,
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
