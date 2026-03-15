import { notFound } from "next/navigation";
import { fetchInvoiceByToken } from "@/lib/invoice/fetch-public";
import { InvoiceHTML } from "@/components/invoice/InvoiceHTML";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const result = await fetchInvoiceByToken(token);
  if (result.error || !result.data) {
    notFound();
  }

  const pdfUrl = `/api/invoice/public/${token}/pdf`;

  return (
    <div style={wrapper}>
      <div style={toolbar}>
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={downloadButton}>
          Download PDF
        </a>
      </div>
      <InvoiceHTML data={result.data} />
    </div>
  );
}

const wrapper: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#F5F5F5",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "24px 16px",
};

const toolbar: React.CSSProperties = {
  width: "595px",
  maxWidth: "100%",
  display: "flex",
  justifyContent: "flex-end",
  marginBottom: "16px",
};

const downloadButton: React.CSSProperties = {
  fontFamily: '"Barlow", Arial, Helvetica, sans-serif',
  fontSize: "13px",
  fontWeight: 500,
  letterSpacing: "0.05em",
  padding: "10px 20px",
  border: "1px solid #0D0D0B",
  background: "#0D0D0B",
  color: "#FFFFFF",
  cursor: "pointer",
  textDecoration: "none",
};
