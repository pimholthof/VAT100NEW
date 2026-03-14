"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getReceipt } from "@/lib/actions/receipts";
import { ReceiptForm } from "@/components/receipt/ReceiptForm";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ReceiptDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const [editing, setEditing] = useState(false);

  const { data: result, isLoading } = useQuery({
    queryKey: ["receipt", id],
    queryFn: () => getReceipt(id),
  });

  const receipt = result?.data;

  if (isLoading) {
    return (
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-lg)",
          fontWeight: 300,
        }}
      >
        Laden...
      </p>
    );
  }

  if (!receipt) {
    return (
      <div>
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-lg)",
            fontWeight: 300,
          }}
        >
          Bon niet gevonden.
        </p>
        <Link
          href="/dashboard/receipts"
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-md)",
            fontWeight: 500,
            color: "var(--foreground)",
          }}
        >
          Terug naar bonnen
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <Link
          href="/dashboard/receipts"
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-xs)",
            fontWeight: 500,
            letterSpacing: "var(--tracking-caps)",
            textTransform: "uppercase",
            color: "var(--foreground)",
            opacity: 0.6,
            textDecoration: "none",
          }}
        >
          ← Terug naar bonnen
        </Link>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
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
            {receipt.vendor_name || "Bon"}
          </h1>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={buttonSecondaryStyle}
            >
              Bewerken
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <ReceiptForm
          receipt={receipt}
          onSaved={() => {
            setEditing(false);
            queryClient.invalidateQueries({ queryKey: ["receipt", id] });
            queryClient.invalidateQueries({ queryKey: ["receipts"] });
          }}
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1px",
            border: "1px solid var(--foreground)",
            marginBottom: 32,
          }}
        >
          <DetailCell
            label="Datum"
            value={receipt.receipt_date ? formatDate(receipt.receipt_date) : null}
          />
          <DetailCell label="Leverancier" value={receipt.vendor_name} />
          <DetailCell label="Categorie" value={receipt.category} />
          <DetailCell
            label="BTW-tarief"
            value={receipt.vat_rate != null ? `${receipt.vat_rate}%` : null}
          />
          <DetailCell
            label="Bedrag excl. BTW"
            value={
              receipt.amount_ex_vat != null
                ? formatCurrency(receipt.amount_ex_vat)
                : null
            }
          />
          <DetailCell
            label="BTW"
            value={
              receipt.vat_amount != null
                ? formatCurrency(receipt.vat_amount)
                : null
            }
          />
          <DetailCell
            label="Bedrag incl. BTW"
            value={
              receipt.amount_inc_vat != null
                ? formatCurrency(receipt.amount_inc_vat)
                : null
            }
          />
          <DetailCell
            label="Aangemaakt"
            value={formatDate(receipt.created_at)}
          />
        </div>
      )}
    </div>
  );
}

function DetailCell({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div style={{ padding: 20, borderBottom: "1px solid var(--foreground)" }}>
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-xs)",
          fontWeight: 500,
          letterSpacing: "var(--tracking-caps)",
          textTransform: "uppercase",
          margin: "0 0 4px",
          opacity: 0.6,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-lg)",
          fontWeight: 300,
          margin: 0,
        }}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}

const buttonSecondaryStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-body-md)",
  fontWeight: 500,
  letterSpacing: "var(--tracking-caps)",
  textTransform: "uppercase",
  padding: "10px 16px",
  border: "1px solid var(--foreground)",
  background: "transparent",
  color: "var(--foreground)",
  cursor: "pointer",
};
