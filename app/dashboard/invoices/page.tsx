"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInvoices, deleteInvoice, updateInvoiceStatus } from "@/lib/actions/invoices";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { Th, Td } from "@/components/ui";

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

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      updateInvoiceStatus(id, status),
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
          marginBottom: 48,
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-lg)",
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
            letterSpacing: "0.05em",
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
                  <select
                    value={invoice.status}
                    onChange={(e) =>
                      statusMutation.mutate({
                        id: invoice.id,
                        status: e.target.value as InvoiceStatus,
                      })
                    }
                    style={{
                      width: 130,
                      padding: "6px 0",
                      border: "none",
                      borderBottom: "var(--border-input)",
                      background: "transparent",
                      color: "var(--foreground)",
                      fontFamily: "var(--font-body), sans-serif",
                      fontSize: "var(--text-body-md)",
                      fontWeight: 300,
                      outline: "none",
                      opacity:
                        statusMutation.isPending &&
                        statusMutation.variables?.id === invoice.id
                          ? 0.5
                          : 1,
                    }}
                  >
                    <option value="draft">Concept</option>
                    <option value="sent">Verzonden</option>
                    <option value="paid">Betaald</option>
                    <option value="overdue">Verlopen</option>
                  </select>
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
                        letterSpacing: "0.02em",
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
                          letterSpacing: "0.02em",
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

