import Link from "next/link";
import { fetchInvoiceData } from "@/lib/invoice/fetch";
import { InvoiceHTML } from "@/components/invoice/InvoiceHTML";

export default async function InvoicePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await fetchInvoiceData(id);

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
          width: "595px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
        <a
          href={`/api/invoice/${id}/pdf`}
          style={{
            fontSize: "var(--text-body-md)",
            fontFamily: "var(--font-body), sans-serif",
            fontWeight: 500,
            color: "var(--foreground)",
            textDecoration: "none",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            padding: "8px 20px",
            border: "1px solid rgba(13, 13, 11, 0.2)",
          }}
        >
          Download PDF
        </a>
      </div>

      {/* Invoice Preview */}
      <div
        style={{
          border: "var(--border-rule)",
        }}
      >
        <InvoiceHTML data={data} />
      </div>
    </div>
  );
}
