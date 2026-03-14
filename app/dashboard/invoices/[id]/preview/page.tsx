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
        backgroundColor: "#E8E8E6",
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
              fontSize: "12px",
              fontFamily: '"Barlow", sans-serif',
              fontWeight: 400,
              color: "#0D0D0B",
              textDecoration: "none",
              letterSpacing: "0.02em",
            }}
          >
            &larr; Overzicht
          </Link>
          <Link
            href={`/dashboard/invoices/${id}`}
            style={{
              fontSize: "12px",
              fontFamily: '"Barlow", sans-serif',
              fontWeight: 400,
              color: "#0D0D0B",
              textDecoration: "none",
              letterSpacing: "0.02em",
            }}
          >
            Bewerken
          </Link>
        </div>
        <a
          href={`/api/invoice/${id}/pdf`}
          style={{
            fontSize: "12px",
            fontFamily: '"Barlow", sans-serif',
            fontWeight: 500,
            color: "#0D0D0B",
            textDecoration: "none",
            letterSpacing: "0.02em",
            padding: "8px 20px",
            border: "0.5px solid #0D0D0B",
          }}
        >
          Download PDF
        </a>
      </div>

      {/* Invoice Preview */}
      <div
        style={{
          boxShadow: "0 2px 24px rgba(0,0,0,0.08)",
        }}
      >
        <InvoiceHTML data={data} />
      </div>
    </div>
  );
}
