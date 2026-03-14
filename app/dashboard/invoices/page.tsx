"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInvoices, deleteInvoice } from "@/lib/actions/invoices";
import type { Invoice } from "@/lib/types";

const statusLabels: Record<string, string> = {
  draft: "Concept",
  sent: "Verzonden",
  paid: "Betaald",
  overdue: "Verlopen",
};

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

export default function InvoicesPage() {
  const queryClient = useQueryClient();

  const { data: result, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => getInvoices(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const invoices = result?.data ?? [];

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
          Facturen
        </h1>
        <Link
          href="/dashboard/invoices/new"
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
          + Nieuwe factuur
        </Link>
      </div>

      {isLoading ? (
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-lg)",
            fontWeight: 300,
          }}
        >
          Laden...
        </p>
      ) : invoices.length === 0 ? (
        <div
          style={{
            border: "1px solid var(--foreground)",
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
            Nog geen facturen aangemaakt.
          </p>
          <Link
            href="/dashboard/invoices/new"
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "var(--text-body-md)",
              fontWeight: 500,
              color: "var(--foreground)",
            }}
          >
            Maak je eerste factuur
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
              <Th>Nummer</Th>
              <Th>Klant</Th>
              <Th>Datum</Th>
              <Th>Status</Th>
              <Th style={{ textAlign: "right" }}>Totaal</Th>
              <Th style={{ textAlign: "right" }}>Acties</Th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice: Invoice & { client?: { name: string } }) => (
              <tr
                key={invoice.id}
                style={{ borderBottom: "var(--border)" }}
              >
                <Td>
                  <Link
                    href={`/dashboard/invoices/${invoice.id}`}
                    style={{
                      color: "var(--foreground)",
                      fontWeight: 500,
                    }}
                  >
                    {invoice.invoice_number}
                  </Link>
                </Td>
                <Td>{(invoice as Invoice & { client?: { name: string } }).client?.name ?? "—"}</Td>
                <Td>{formatDate(invoice.issue_date)}</Td>
                <Td>
                  <span
                    style={{
                      fontSize: "var(--text-body-xs)",
                      fontWeight: 500,
                      letterSpacing: "var(--tracking-caps)",
                      textTransform: "uppercase",
                      padding: "4px 8px",
                      border: "1px solid var(--foreground)",
                      display: "inline-block",
                    }}
                  >
                    {statusLabels[invoice.status] ?? invoice.status}
                  </span>
                </Td>
                <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrency(invoice.total_inc_vat)}
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Link
                      href={`/dashboard/invoices/${invoice.id}/preview`}
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
                    {invoice.status === "draft" && (
                      <button
                        onClick={() => {
                          if (confirm("Weet je zeker dat je deze factuur wilt verwijderen?")) {
                            deleteMutation.mutate(invoice.id);
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
                    )}
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
