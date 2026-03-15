"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInvoices, deleteInvoice, updateInvoiceStatus, type InvoiceWithClient } from "@/lib/actions/invoices";
import type { InvoiceStatus } from "@/lib/types";
import { Th, Td } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";

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
          Facturen
        </h1>
        <Link
          href="/dashboard/invoices/new"
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
          + Nieuwe factuur
        </Link>
      </div>

      {isLoading ? (
        <div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ width: "100%", height: 40, marginBottom: 1 }}
            />
          ))}
        </div>
      ) : invoices.length === 0 ? (
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
            Nog geen facturen aangemaakt.
          </p>
          <Link
            href="/dashboard/invoices/new"
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "var(--text-body-md)",
              fontWeight: 400,
              color: "var(--foreground)",
              textDecoration: "none",
              opacity: 0.6,
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
          }}
        >
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
              <Th>Nummer</Th>
              <Th>Klant</Th>
              <Th>Datum</Th>
              <Th>Status</Th>
              <Th style={{ textAlign: "right" }}>Totaal</Th>
              <Th style={{ textAlign: "right" }}>Acties</Th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice: InvoiceWithClient) => (
              <tr key={invoice.id} style={{ borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
                <Td>
                  <Link
                    href={`/dashboard/invoices/${invoice.id}`}
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: "var(--text-mono-md)",
                      color: "var(--foreground)",
                      fontWeight: 400,
                      textDecoration: "none",
                    }}
                  >
                    {invoice.invoice_number}
                  </Link>
                </Td>
                <Td>{invoice.client?.name ?? "—"}</Td>
                <Td>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "var(--text-mono-md)" }}>
                    {formatDate(invoice.issue_date)}
                  </span>
                </Td>
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
                      borderBottom: "0.5px solid rgba(13,13,11,0.12)",
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
                <Td style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "var(--text-mono-md)", fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(invoice.total_inc_vat)}
                  </span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Link
                      href={`/dashboard/invoices/${invoice.id}/preview`}
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
                    {invoice.status === "draft" && (
                      <button
                        onClick={() => {
                          if (confirm("Weet je zeker dat je deze factuur wilt verwijderen?")) {
                            deleteMutation.mutate(invoice.id);
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
