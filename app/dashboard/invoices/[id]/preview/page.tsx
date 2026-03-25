import Link from "next/link";
import { fetchInvoiceData } from "@/lib/invoice/fetch";
import { InvoiceHTML } from "@/features/invoices/components/InvoiceHTML";
import { SendEmailButton } from "@/features/invoices/components/SendEmailButton";

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
          ← Terug naar facturen
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
          {data.invoice.status !== "draft" && data.client.email && (
            <SendEmailButton
              invoiceId={id}
              clientEmail={data.client.email}
            />
          )}
          <a
            href={`/api/invoice/${id}/pdf`}
            style={{
              fontSize: "var(--text-body-md)",
              fontFamily: "var(--font-body), sans-serif",
              fontWeight: 500,
              color: "var(--foreground)",
              textDecoration: "none",
              letterSpacing: "0.05em",
              padding: "8px 20px",
              border: "1px solid rgba(13, 13, 11, 0.2)",
            }}
          >
            Download PDF
          </a>
        </div>
      </div>

      {/* Invoice Preview */}
      <div
        style={{
          border: "var(--border-rule)",
          width: "100%",
          maxWidth: "595px",
          overflowX: "auto",
        }}
      >
        <InvoiceHTML data={data} />
      </div>
    </div>
  );
}
