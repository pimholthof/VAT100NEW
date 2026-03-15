"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getReceipts, deleteReceipt } from "@/lib/actions/receipts";
import { getKostensoortByCode } from "@/lib/constants/costs";
import type { Receipt } from "@/lib/types";
import { Th, Td, SkeletonTable } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

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
          alignItems: "flex-end",
          marginBottom: 80,
        }}
      >
        <h1 className="display-title">
          Bonnen
        </h1>
        <Link
          href="/dashboard/receipts/new"
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-label)",
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            padding: "14px 28px",
            border: "0.5px solid rgba(13,13,11,0.25)",
            background: "transparent",
            color: "var(--foreground)",
            textDecoration: "none",
            display: "inline-block",
            transition: "opacity 0.2s ease",
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
        <div style={{ paddingTop: "var(--space-block)" }}>
          <p className="empty-state">
            Nog geen bonnen
          </p>
          <Link
            href="/dashboard/receipts/new"
            className="table-action"
            style={{ opacity: 0.4 }}
          >
            Voeg je eerste bon toe
          </Link>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                    <span className="mono-amount">
                      {receipt.receipt_date ? formatDate(receipt.receipt_date) : "—"}
                    </span>
                  </Td>
                  <Td style={{ fontWeight: 400 }}>{receipt.vendor_name ?? "—"}</Td>
                  <Td>
                    {kostensoort ? kostensoort.label : receipt.category ?? "—"}
                  </Td>
                  <Td style={{ textAlign: "right" }}>
                    <span className="mono-amount">
                      {receipt.amount_ex_vat != null ? formatCurrency(receipt.amount_ex_vat) : "—"}
                    </span>
                  </Td>
                  <Td style={{ textAlign: "right" }}>
                    <span className="mono-amount">
                      {receipt.vat_amount != null ? formatCurrency(receipt.vat_amount) : "—"}
                    </span>
                  </Td>
                  <Td style={{ textAlign: "right" }}>
                    <span className="mono-amount">
                      {receipt.amount_inc_vat != null ? formatCurrency(receipt.amount_inc_vat) : "—"}
                    </span>
                  </Td>
                  <Td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                      <Link
                        href={`/dashboard/receipts/${receipt.id}`}
                        className="table-action"
                      >
                        Bekijk
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm("Weet je zeker dat je deze bon wilt verwijderen?")) {
                            deleteMutation.mutate(receipt.id);
                          }
                        }}
                        className="table-action"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          opacity: 0.3,
                          padding: 0,
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
