import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchInvoiceByToken } from "@/lib/invoice/fetch-public";
import { InvoiceHTML } from "@/features/invoices/components/InvoiceHTML";
import { formatCurrency } from "@/lib/format";
import type { InvoiceTemplate } from "@/lib/types";
import { createServiceClient } from "@/lib/supabase/service";

const VALID_TEMPLATES = ["poster", "minimaal", "klassiek", "strak", "editoriaal"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const result = await fetchInvoiceByToken(token);
  if (result.error || !result.data) {
    return { title: "Factuur niet gevonden — VAT100" };
  }
  const { invoice, profile } = result.data;
  const title = `Factuur ${invoice.invoice_number} — ${profile.studio_name || profile.full_name}`;
  const description = `Factuur ter waarde van ${formatCurrency(invoice.total_inc_vat)}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const sp = await searchParams;

  const result = await fetchInvoiceByToken(token);
  if (result.error || !result.data) {
    notFound();
  }

  const templateParam = typeof sp.template === "string" ? sp.template : "poster";
  const template = (VALID_TEMPLATES.includes(templateParam) ? templateParam : "poster") as InvoiceTemplate;

  // Witlabel + logo voor Plus-tier verzenders.
  const svc = createServiceClient();
  const { data: sub } = await svc
    .from("subscriptions")
    .select("plan_id")
    .eq("user_id", result.data.profile.id)
    .in("status", ["active", "past_due"])
    .single();
  const isPlus = sub?.plan_id === "plus" || sub?.plan_id === "plus_yearly";
  const branded = !isPlus;
  let logoUrl: string | null = null;
  if (isPlus && result.data.profile.logo_path) {
    const { data: signed } = await svc.storage
      .from("receipts")
      .createSignedUrl(result.data.profile.logo_path, 3600);
    logoUrl = signed?.signedUrl ?? null;
  }

  const pdfUrl = `/api/invoice/public/${token}/pdf?template=${template}`;
  const { invoice } = result.data;
  const showPayButton = invoice.payment_link && invoice.status !== "paid";

  return (
    <div style={wrapper}>
      <div style={toolbar}>
        {showPayButton && (
          <a href={invoice.payment_link!} style={payButton}>
            Betaal nu
          </a>
        )}
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={downloadButton}>
          Download PDF
        </a>
      </div>
      <div style={{ width: "100%", maxWidth: "595px", overflowX: "auto" }}>
        <InvoiceHTML data={result.data} template={template} branded={branded} logoUrl={logoUrl} />
      </div>
    </div>
  );
}

const wrapper: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "var(--background)",
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
  fontFamily: '"Helvetica Neue LT Std", "Helvetica Neue", Helvetica, Arial, sans-serif',
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  padding: "14px 28px",
  border: "1px solid #000000",
  background: "#000000",
  color: "#FAF9F6",
  cursor: "pointer",
  textDecoration: "none",
};

const payButton: React.CSSProperties = {
  fontFamily: '"Helvetica Neue LT Std", "Helvetica Neue", Helvetica, Arial, sans-serif',
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  padding: "14px 28px",
  border: "1px solid #A51C30",
  background: "#A51C30",
  color: "#FAF9F6",
  cursor: "pointer",
  textDecoration: "none",
};
