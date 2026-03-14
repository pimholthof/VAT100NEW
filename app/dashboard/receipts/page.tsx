"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getReceipts, deleteReceipt } from "@/lib/actions/receipts";
import type { Receipt } from "@/lib/types";

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
          Bonnen
        </h1>
        <Link
          href="/dashboard/receipts/new"
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-lg)",
            fontWeight: 500,
            letterSpacing: "var(--tracking-caps)",
            textTransform: "uppercase",
            padding: "12px 20px",
            border: "none",
            background: "var(--foreground)",
            color: "var(--background)",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          + Nieuwe bon
        </Link>
      </div>

      {isLoading ? (
        <SkeletonTable />
      ) : receipts.length === 0 ? (
        <div
          style={{
            border: "none",
            borderTop: "var(--border-rule)",
            borderBottom: "var(--border-rule)",
            padding: 48,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "var(--text-body-lg)",
              fontWeight: 300,
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
              fontWeight: 500,
              color: "var(--foreground)",
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
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-md)",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--foreground)",
                textAlign: "left",
              }}
            >
              <Th>Datum</Th>
              <Th>Leverancier</Th>
              <Th>Categorie</Th>
              <Th style={{ textAlign: "right" }}>Excl. BTW</Th>
              <Th style={{ textAlign: "right" }}>BTW</Th>
              <Th style={{ textAlign: "right" }}>Incl. BTW</Th>
              <Th style={{ textAlign: "right" }}>Acties</Th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((receipt: Receipt) => (
              <tr
                key={receipt.id}
                style={{ borderBottom: "var(--border)" }}
              >
                <Td>
                  {receipt.receipt_date
                    ? formatDate(receipt.receipt_date)
                    : "—"}
                </Td>
                <Td>{receipt.vendor_name ?? "—"}</Td>
                <Td>{receipt.category ?? "—"}</Td>
                <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {receipt.amount_ex_vat != null
                    ? formatCurrency(receipt.amount_ex_vat)
                    : "—"}
                </Td>
                <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {receipt.vat_amount != null
                    ? formatCurrency(receipt.vat_amount)
                    : "—"}
                </Td>
                <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {receipt.amount_inc_vat != null
                    ? formatCurrency(receipt.amount_inc_vat)
                    : "—"}
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Link
                      href={`/dashboard/receipts/${receipt.id}`}
                      style={{
                        fontSize: "var(--text-body-xs)",
                        fontWeight: 500,
                        color: "var(--foreground)",
                        textTransform: "uppercase",
                        letterSpacing: "var(--tracking-caps)",
                      }}
                    >
                      Bekijk
                    </Link>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            "Weet je zeker dat je deze bon wilt verwijderen?"
                          )
                        ) {
                          deleteMutation.mutate(receipt.id);
                        }
                      }}
                      style={{
                        fontSize: "var(--text-body-xs)",
                        fontWeight: 500,
                        color: "var(--foreground)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textTransform: "uppercase",
                        letterSpacing: "var(--tracking-caps)",
                        opacity: 0.6,
                      }}
                    >
                      Verwijder
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Th({
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
        padding: "12px 8px",
        ...style,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <td
      style={{
        padding: "12px 8px",
        fontWeight: 300,
        ...style,
      }}
    >
      {children}
    </td>
  );
}

function SkeletonTable() {
  return (
    <div style={{ opacity: 0.12 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr 1fr 80px",
          gap: 12,
          padding: "10px 12px",
          borderBottom: "1px solid var(--foreground)",
        }}
      >
        {[60, 80, 70, 60, 50, 50, 40].map((w, i) => (
          <div key={i} className="skeleton" style={{ width: `${w}%`, height: 9 }} />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, row) => (
        <div
          key={row}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr 1fr 80px",
            gap: 12,
            padding: "12px 12px",
            borderBottom: "1px solid rgba(13, 13, 11, 0.08)",
          }}
        >
          {[50, 70, 60, 50, 40, 40, 30].map((w, i) => (
            <div key={i} className="skeleton" style={{ width: `${w}%`, height: 13 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
