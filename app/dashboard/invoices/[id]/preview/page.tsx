import Link from "next/link";
import { fetchInvoiceData } from "@/lib/invoice/fetch";
import { InvoicePreviewClient } from "@/features/invoices/components/InvoicePreviewClient";
import { SendEmailButton } from "@/features/invoices/components/SendEmailButton";
import { PaymentLinkButton } from "@/features/invoices/components/PaymentLinkButton";
import { PdfDownloadButton } from "@/features/invoices/components/PdfDownloadButton";

export default async function InvoicePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchInvoiceData(id);

  if (result.error || !result.data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "var(--background)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderLeft: "2px solid var(--foreground)",
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-md)",
            fontWeight: 400,
            marginBottom: 24,
          }}
        >
          {result.error ?? "Factuur niet gevonden"}
        </div>
        <Link
          href="/dashboard/invoices"
          style={{
            fontSize: "var(--text-body-md)",
            fontFamily: "var(--font-body), sans-serif",
            fontWeight: 400,
            color: "var(--foreground)",
          }}
        >
          &larr; Terug naar facturen
        </Link>
      </div>
    );
  }

  const data = result.data;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--background)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 20px",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          width: "100%",
          maxWidth: "595px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Link
            href="/dashboard/invoices"
            style={{
              fontSize: "var(--text-body-md)",
              fontFamily: "var(--font-body), sans-serif",
              fontWeight: 400,
              color: "var(--foreground)",
              textDecoration: "none",
              letterSpacing: "0.05em",
            }}
          >
            &larr; Overzicht
          </Link>
          <Link
            href={`/dashboard/invoices/${id}`}
            style={{
              fontSize: "var(--text-body-md)",
              fontFamily: "var(--font-body), sans-serif",
              fontWeight: 400,
              color: "var(--foreground)",
              textDecoration: "none",
              letterSpacing: "0.05em",
            }}
          >
            Bewerken
          </Link>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {data.invoice.status !== "draft" && data.invoice.status !== "paid" && (
            <PaymentLinkButton
              invoiceId={id}
              existingLink={data.invoice.payment_link ?? null}
            />
          )}
          {data.invoice.status !== "draft" && data.client.email && (
            <SendEmailButton
              invoiceId={id}
              clientEmail={data.client.email}
            />
          )}
          <a
            href={`/api/invoice/${id}/ubl`}
            download
            style={{
              fontSize: "var(--text-body-md)",
              fontFamily: "var(--font-body), sans-serif",
              fontWeight: 500,
              color: "var(--foreground)",
              textDecoration: "none",
              letterSpacing: "0.05em",
              padding: "8px 20px",
              border: "var(--border-light)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            Download UBL
          </a>
          <PdfDownloadButton invoiceId={id} />
        </div>
      </div>

      {/* Invoice Preview with Template Picker */}
      <InvoicePreviewClient data={data} />
    </div>
  );
}
