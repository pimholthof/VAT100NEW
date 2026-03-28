"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getReceipt, getReceiptImageUrl } from "@/features/receipts/actions";
import { getKostensoortByCode } from "@/lib/constants/costs";
import { ReceiptForm } from "@/features/receipts/components/ReceiptForm";
import { DetailCell, ButtonSecondary, PageHeader } from "@/components/ui";
import { ReceiptLightbox } from "@/features/receipts/components/ReceiptLightbox";
import { formatCurrency, formatDate } from "@/lib/format";

export default function ReceiptDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const [editing, setEditing] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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
      <div style={{ padding: "64px 0" }}>
        <div className="skeleton" style={{ width: 200, height: 32, marginBottom: 32 }} />
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div className="skeleton" style={{ width: 80, height: 9, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: "100%", height: 36 }} />
          </div>
        ))}
      </div>
    );
  }

  if (!receipt) {
    return (
      <div>
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "13px",
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
            fontWeight: 400,
            color: "var(--foreground)",
            textDecoration: "none",
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
      <PageHeader
        title={receipt.vendor_name || "Bon"}
        titleSize="md"
        backHref="/dashboard/receipts"
        backLabel="Terug naar bonnen"
        action={
          !editing ? (
            <ButtonSecondary onClick={() => setEditing(true)}>
              Bewerken
            </ButtonSecondary>
          ) : undefined
        }
      />
      {receipt.ai_processed && (
        <p
          style={{
            fontSize: "var(--text-mono-sm)",
            fontWeight: 400,
            opacity: 0.4,
            marginTop: -48,
            marginBottom: 32,
          }}
        >
          AI verwerkt
        </p>
      )}

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
            <>
              <div
                role="button"
                tabIndex={0}
                aria-label="Klik om bon te vergroten"
                onClick={() => setLightboxOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setLightboxOpen(true);
                  }
                }}
                style={{ cursor: "zoom-in", marginBottom: 32 }}
              >
                {receipt.storage_path?.endsWith(".pdf") ? (
                  <iframe
                    src={imageUrl}
                    title="PDF bon"
                    style={{
                      width: "100%",
                      maxWidth: 500,
                      height: 500,
                      border: "0.5px solid rgba(13,13,11,0.15)",
                      pointerEvents: "none",
                    }}
                  />
                ) : (
                  <div style={{ position: "relative", width: "100%", maxWidth: 300, height: 400 }}>
                    <Image
                      src={imageUrl}
                      alt="Bon afbeelding"
                      fill
                      style={{
                        objectFit: "contain",
                        border: "0.5px solid rgba(13,13,11,0.15)",
                      }}
                      unoptimized
                    />
                  </div>
                )}
              </div>
              <ReceiptLightbox
                open={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                imageUrl={imageUrl}
                isPdf={!!receipt.storage_path?.endsWith(".pdf")}
              />
            </>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0,
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
            {receipt.currency !== "EUR" && (
              <DetailCell
                label="Valuta"
                value={receipt.currency}
              />
            )}
            <DetailCell
              label="Bedrag excl. BTW"
              value={
                receipt.amount_ex_vat != null
                  ? formatCurrency(receipt.amount_ex_vat, receipt.currency)
                  : null
              }
            />
            <DetailCell
              label="BTW"
              value={
                receipt.vat_amount != null
                  ? formatCurrency(receipt.vat_amount, receipt.currency)
                  : null
              }
            />
            <DetailCell
              label="Bedrag incl. BTW"
              value={
                receipt.amount_inc_vat != null
                  ? formatCurrency(receipt.amount_inc_vat, receipt.currency)
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
