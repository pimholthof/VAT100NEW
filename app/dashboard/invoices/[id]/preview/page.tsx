import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { InvoiceLine, Client } from "@/lib/types";

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function InvoicePreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!invoice) notFound();

  const { data: lines } = await supabase
    .from("invoice_lines")
    .select("*")
    .eq("invoice_id", id)
    .order("sort_order", { ascending: true });

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", invoice.client_id)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const typedLines = (lines ?? []) as InvoiceLine[];
  const typedClient = client as Client | null;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-md)",
            fontWeight: 900,
            letterSpacing: "var(--tracking-display)",
            lineHeight: 1,
            margin: 0,
          }}
        >
          Preview
        </h1>
        <div style={{ display: "flex", gap: 12 }}>
          <Link
            href={`/dashboard/invoices/${id}`}
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "var(--text-body-md)",
              fontWeight: 500,
              letterSpacing: "var(--tracking-caps)",
              textTransform: "uppercase",
              padding: "10px 16px",
              border: "1px solid var(--foreground)",
              color: "var(--foreground)",
              textDecoration: "none",
            }}
          >
            Bewerken
          </Link>
          <Link
            href="/dashboard/invoices"
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "var(--text-body-md)",
              fontWeight: 500,
              letterSpacing: "var(--tracking-caps)",
              textTransform: "uppercase",
              padding: "10px 16px",
              border: "none",
              background: "var(--foreground)",
              color: "var(--background)",
              textDecoration: "none",
            }}
          >
            Terug naar overzicht
          </Link>
        </div>
      </div>

      {/* Invoice document */}
      <div
        style={{
          border: "1px solid var(--foreground)",
          padding: 48,
          maxWidth: 800,
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-md)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 48,
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "var(--font-display), sans-serif",
                fontSize: "1.5rem",
                fontWeight: 900,
                letterSpacing: "var(--tracking-display)",
                margin: "0 0 4px",
              }}
            >
              {profile?.studio_name || profile?.full_name || ""}
            </p>
            {profile?.address && (
              <p style={{ margin: "2px 0", fontWeight: 300 }}>
                {profile.address}
              </p>
            )}
            {(profile?.postal_code || profile?.city) && (
              <p style={{ margin: "2px 0", fontWeight: 300 }}>
                {[profile.postal_code, profile.city].filter(Boolean).join(" ")}
              </p>
            )}
            {profile?.kvk_number && (
              <p style={{ margin: "8px 0 0", fontWeight: 300, fontSize: "var(--text-body-sm)" }}>
                KVK: {profile.kvk_number}
              </p>
            )}
            {profile?.btw_number && (
              <p style={{ margin: "2px 0 0", fontWeight: 300, fontSize: "var(--text-body-sm)" }}>
                BTW: {profile.btw_number}
              </p>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <p
              style={{
                fontFamily: "var(--font-display), sans-serif",
                fontSize: "1.5rem",
                fontWeight: 900,
                letterSpacing: "var(--tracking-display)",
                margin: "0 0 8px",
                textTransform: "uppercase",
              }}
            >
              Factuur
            </p>
            <p style={{ margin: "2px 0", fontWeight: 400 }}>
              #{invoice.invoice_number}
            </p>
            <p style={{ margin: "2px 0", fontWeight: 300 }}>
              Datum: {formatDate(invoice.issue_date)}
            </p>
            <p style={{ margin: "2px 0", fontWeight: 300 }}>
              Vervaldatum: {formatDate(invoice.due_date)}
            </p>
          </div>
        </div>

        {/* Client info */}
        {typedClient && (
          <div style={{ marginBottom: 32 }}>
            <p
              style={{
                fontSize: "var(--text-body-xs)",
                fontWeight: 500,
                letterSpacing: "var(--tracking-caps)",
                textTransform: "uppercase",
                margin: "0 0 8px",
                opacity: 0.5,
              }}
            >
              Factuur aan
            </p>
            <p style={{ margin: "2px 0", fontWeight: 500 }}>{typedClient.name}</p>
            {typedClient.contact_name && (
              <p style={{ margin: "2px 0", fontWeight: 300 }}>
                t.a.v. {typedClient.contact_name}
              </p>
            )}
            {typedClient.address && (
              <p style={{ margin: "2px 0", fontWeight: 300 }}>
                {typedClient.address}
              </p>
            )}
            {(typedClient.postal_code || typedClient.city) && (
              <p style={{ margin: "2px 0", fontWeight: 300 }}>
                {[typedClient.postal_code, typedClient.city].filter(Boolean).join(" ")}
              </p>
            )}
            {typedClient.kvk_number && (
              <p style={{ margin: "4px 0 0", fontWeight: 300, fontSize: "var(--text-body-sm)" }}>
                KVK: {typedClient.kvk_number}
              </p>
            )}
          </div>
        )}

        {/* Lines table */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: 24,
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid var(--foreground)" }}>
              <PreviewTh>Omschrijving</PreviewTh>
              <PreviewTh style={{ textAlign: "right" }}>Aantal</PreviewTh>
              <PreviewTh>Eenheid</PreviewTh>
              <PreviewTh style={{ textAlign: "right" }}>Tarief</PreviewTh>
              <PreviewTh style={{ textAlign: "right" }}>Bedrag</PreviewTh>
            </tr>
          </thead>
          <tbody>
            {typedLines.map((line) => (
              <tr
                key={line.id}
                style={{ borderBottom: "var(--border)" }}
              >
                <PreviewTd>{line.description}</PreviewTd>
                <PreviewTd style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {line.quantity}
                </PreviewTd>
                <PreviewTd>{line.unit}</PreviewTd>
                <PreviewTd style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrency(line.rate)}
                </PreviewTd>
                <PreviewTd style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrency(line.amount)}
                </PreviewTd>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div style={{ width: 250 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                fontWeight: 300,
              }}
            >
              <span>Subtotaal</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatCurrency(invoice.subtotal_ex_vat)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                fontWeight: 300,
              }}
            >
              <span>BTW ({invoice.vat_rate}%)</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatCurrency(invoice.vat_amount)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                fontWeight: 500,
                borderTop: "1px solid var(--foreground)",
                marginTop: 4,
                fontSize: "var(--text-body-lg)",
              }}
            >
              <span>Totaal</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatCurrency(invoice.total_inc_vat)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div
            style={{
              marginTop: 32,
              paddingTop: 16,
              borderTop: "var(--border)",
            }}
          >
            <p
              style={{
                fontSize: "var(--text-body-xs)",
                fontWeight: 500,
                letterSpacing: "var(--tracking-caps)",
                textTransform: "uppercase",
                margin: "0 0 8px",
                opacity: 0.5,
              }}
            >
              Notities
            </p>
            <p style={{ margin: 0, fontWeight: 300, whiteSpace: "pre-wrap" }}>
              {invoice.notes}
            </p>
          </div>
        )}

        {/* Payment info */}
        {profile?.iban && (
          <div
            style={{
              marginTop: 32,
              paddingTop: 16,
              borderTop: "var(--border)",
            }}
          >
            <p
              style={{
                fontSize: "var(--text-body-xs)",
                fontWeight: 500,
                letterSpacing: "var(--tracking-caps)",
                textTransform: "uppercase",
                margin: "0 0 8px",
                opacity: 0.5,
              }}
            >
              Betaalgegevens
            </p>
            <p style={{ margin: "2px 0", fontWeight: 300 }}>
              IBAN: {profile.iban}
            </p>
            {profile.bic && (
              <p style={{ margin: "2px 0", fontWeight: 300 }}>
                BIC: {profile.bic}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewTh({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <th
      style={{
        fontWeight: 500,
        fontSize: "var(--text-body-xs)",
        letterSpacing: "var(--tracking-caps)",
        textTransform: "uppercase",
        padding: "10px 8px",
        textAlign: "left",
        ...style,
      }}
    >
      {children}
    </th>
  );
}

function PreviewTd({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <td style={{ padding: "10px 8px", fontWeight: 300, ...style }}>
      {children}
    </td>
  );
}
