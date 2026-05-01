import Link from "next/link";
import { cookies } from "next/headers";
import { fetchInvoiceData } from "@/lib/invoice/fetch";
import { InvoicePreviewClient } from "@/features/invoices/components/InvoicePreviewClient";
import { SendEmailButton } from "@/features/invoices/components/SendEmailButton";
import { PaymentLinkButton } from "@/features/invoices/components/PaymentLinkButton";
import { PdfDownloadButton } from "@/features/invoices/components/PdfDownloadButton";
import { getDictionary, getLocaleFromCookie } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export default async function InvoicePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchInvoiceData(id);
  const cookieStore = await cookies();
  const locale = getLocaleFromCookie(cookieStore.get("locale")?.value ? `locale=${cookieStore.get("locale")?.value}` : null);
  const t = getDictionary(locale);

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
          {result.error ?? t.errors.invoiceNotFound}
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
          &larr; {t.invoices.backToInvoices}
        </Link>
      </div>
    );
  }

  const data = result.data;

  // Witlabel + logo voor Plus-tier.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let branded = true;
  let logoUrl: string | null = null;
  if (user) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", user.id)
      .in("status", ["active", "past_due"])
      .single();
    const isPlus = sub?.plan_id === "plus" || sub?.plan_id === "plus_yearly";
    if (isPlus) {
      branded = false;
      if (data.profile.logo_path) {
        const { data: signed } = await supabase.storage
          .from("receipts")
          .createSignedUrl(data.profile.logo_path, 3600);
        logoUrl = signed?.signedUrl ?? null;
      }
    }
  }

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
            &larr; {t.invoices.backToOverview}
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
            {t.invoices.editInvoice}
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
      <InvoicePreviewClient data={data} branded={branded} logoUrl={logoUrl} />
    </div>
  );
}
