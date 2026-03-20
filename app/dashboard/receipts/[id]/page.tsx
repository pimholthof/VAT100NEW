"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getReceipt, getReceiptImageUrl } from "@/lib/actions/receipts";
import { getKostensoortByCode } from "@/lib/constants/costs";
import { ReceiptForm } from "@/components/receipt/ReceiptForm";
import { DetailCell, ButtonSecondary, PageHeader } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

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
      <div className="py-16">
        <div className="skeleton w-[200px] h-8 mb-8" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="mb-5">
            <div className="skeleton w-[80px] h-[9px] mb-2" />
            <div className="skeleton w-full h-9" />
          </div>
        ))}
      </div>
    );
  }

  if (!receipt) {
    return (
      <div>
        <p className="font-sans text-[13px] font-light">
          Bon niet gevonden.
        </p>
        <Link
          href="/dashboard/receipts"
          className="font-sans text-[length:var(--text-body-md)] font-normal text-foreground no-underline"
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
        <p className="font-mono text-[length:var(--text-mono-sm)] font-normal opacity-40 -mt-12 mb-8">
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
            <div className="relative w-full max-w-[300px] h-[400px] mb-8">
              <Image
                src={imageUrl}
                alt="Bon afbeelding"
                fill
                className="object-contain border-[0.5px] border-foreground/15"
                unoptimized
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-0 mb-8">
            <DetailCell
              label="Datum"
              value={
                receipt.receipt_date
                  ? formatDate(receipt.receipt_date)
                  : null
              }
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
              value={
                receipt.vat_rate != null ? `${receipt.vat_rate}%` : null
              }
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
