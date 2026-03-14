"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getReceipts, deleteReceipt } from "@/lib/actions/receipts";
import { getKostensoortByCode } from "@/lib/constants/costs";
import type { Receipt } from "@/lib/types";
import { Th, Td, SkeletonTable } from "@/components/ui";

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

export default function ReceiptsPage() {
  const queryClient = useQueryClient();

  const { data: result, isLoading } = useQuery({
    queryKey: ["receipts"],
    queryFn: () => getReceipts(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReceipt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
    },
  });

  const receipts = result?.data ?? [];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 64,
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-lg)",
            fontWeight: 900,
            letterSpacing: "var(--tracking-display)",
            lineHeight: 0.9,
            margin: 0,
          }}
        >
          Bonnen
        </h1>
        <Link
          href="/dashboard/receipts/new"
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-label)",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "12px 24px",
            border: "0.5px solid var(--foreground)",
            background: "transparent",
            color: "var(--foreground)",
            textDecoration: "none",
            display: "inline-block",
            transition: "all 0.2s ease",
          }}
        >
          + Nieuwe bon
        </Link>
      </div>

      {isLoading ? (
        <SkeletonTable
          columns="24px 1fr 2fr 1fr 1fr 1fr 1fr 80px"
          headerWidths={[10, 60, 80, 70, 60, 50, 50, 40]}
          bodyWidths={[10, 50, 70, 60, 50, 40, 40, 30]}
        />
      ) : receipts.length === 0 ? (
        <div style={{ paddingTop: 48 }}>
          <p
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "13px",
              fontWeight: 300,
              opacity: 0.3,
              margin: "0 0 16px",
            }}
          >
            Nog geen bonnen ingevoerd.
          </p>
          <Link
            href="/dashboard/receipts/new"
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "var(--text-body-md)",
              fontWeight: 400,
              color: "var(--foreground)",
              textDecoration: "none",
              opacity: 0.6,
            }}
          >
            Voeg je eerste bon toe
          </Link>
        </div>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
              <Th style={{ width: 24 }}></Th>
              <Th>Datum</Th>
              <Th>Leverancier</Th>
              <Th>Kostensoort</Th>
              <Th style={{ textAlign: "right" }}>Excl. BTW</Th>
              <Th style={{ textAlign: "right" }}>BTW</Th>
              <Th style={{ textAlign: "right" }}>Incl. BTW</Th>
              <Th style={{ textAlign: "right" }}>Acties</Th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((receipt: Receipt) => {
              const kostensoort = receipt.cost_code
                ? getKostensoortByCode(receipt.cost_code)
                : null;

              return (
                <tr key={receipt.id} style={{ borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
                  <Td style={{ width: 24, textAlign: "center", opacity: 0.4 }}>
                    {receipt.storage_path ? "📷" : ""}
                  </Td>
                  <Td>
                    <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "var(--text-mono-md)" }}>
                      {receipt.receipt_date ? formatDate(receipt.receipt_date) : "—"}
                    </span>
                  </Td>
                  <Td>{receipt.vendor_name ?? "—"}</Td>
                  <Td>
                    {kostensoort ? kostensoort.label : receipt.category ?? "—"}
                  </Td>
                  <Td style={{ textAlign: "right" }}>
                    <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "var(--text-mono-md)", fontVariantNumeric: "tabular-nums" }}>
                      {receipt.amount_ex_vat != null ? formatCurrency(receipt.amount_ex_vat) : "—"}
                    </span>
                  </Td>
                  <Td style={{ textAlign: "right" }}>
                    <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "var(--text-mono-md)", fontVariantNumeric: "tabular-nums" }}>
                      {receipt.vat_amount != null ? formatCurrency(receipt.vat_amount) : "—"}
                    </span>
                  </Td>
                  <Td style={{ textAlign: "right" }}>
                    <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "var(--text-mono-md)", fontVariantNumeric: "tabular-nums" }}>
                      {receipt.amount_inc_vat != null ? formatCurrency(receipt.amount_inc_vat) : "—"}
                    </span>
                  </Td>
                  <Td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <Link
                        href={`/dashboard/receipts/${receipt.id}`}
                        style={{
                          fontSize: "var(--text-label)",
                          fontWeight: 500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--foreground)",
                          textDecoration: "none",
                        }}
                      >
                        Bekijk
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm("Weet je zeker dat je deze bon wilt verwijderen?")) {
                            deleteMutation.mutate(receipt.id);
                          }
                        }}
                        style={{
                          fontSize: "var(--text-label)",
                          fontWeight: 500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--foreground)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          opacity: 0.4,
                        }}
                      >
                        Verwijder
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
