"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getReceipt, getReceiptImageUrl } from "@/lib/actions/receipts";
import { getKostensoortByCode } from "@/lib/constants/costs";
import { ReceiptForm } from "@/components/receipt/ReceiptForm";
import { DetailCell, buttonSecondaryStyle } from "@/components/ui";

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
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const { data: result, isLoading } = useQuery({
    queryKey: ["receipt", id],
    queryFn: () => getReceipt(id),
  });

  const receipt = result?.data;

  useEffect(() => {
    if (receipt?.storage_path) {
      getReceiptImageUrl(receipt.storage_path).then((res) => {
        if (res.data) setImageUrl(res.data);
      });
    }
  }, [receipt?.storage_path]);

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

  const kostensoort = receipt.cost_code
    ? getKostensoortByCode(receipt.cost_code)
    : null;

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <Link
          href="/dashboard/receipts"
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-sm)",
            fontWeight: 400,
            letterSpacing: "0.02em",
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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
            {receipt.ai_processed && (
              <span
                style={{
                  fontFamily: "var(--font-body), sans-serif",
                  fontSize: "var(--text-body-xs)",
                  fontWeight: 400,
                  opacity: 0.5,
                }}
              >
                AI verwerkt ✓
              </span>
            )}
          </div>
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
        <>
          {imageUrl && (
            <div style={{ marginBottom: 32 }}>
              <img
                src={imageUrl}
                alt="Bon afbeelding"
                style={{
                  maxWidth: 300,
                  objectFit: "contain" as const,
                  border: "var(--border-rule)",
                }}
              />
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0,
              border: "none",
              marginBottom: 32,
            }}
          >
            <DetailCell
              label="Datum"
              value={receipt.receipt_date ? formatDate(receipt.receipt_date) : null}
            />
            <DetailCell label="Leverancier" value={receipt.vendor_name} />
            <DetailCell
              label="Kostensoort"
              value={
                kostensoort
                  ? `${kostensoort.label} (${kostensoort.code})`
                  : receipt.category
              }
            />
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
        </>
      )}
    </div>
  );
}

