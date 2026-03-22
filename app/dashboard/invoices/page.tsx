"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInvoices, deleteInvoice, updateInvoiceStatus, type InvoiceWithClient } from "@/features/invoices/actions";
import type { InvoiceStatus } from "@/lib/types";
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
      {/* Page header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 80,
        }}
      >
        <div>
          <h1 className="display-title" style={{ fontSize: "4rem", letterSpacing: "-0.04em", marginBottom: 8 }}>
            Ledger
          </h1>
          <p className="label" style={{ opacity: 0.3 }}>{invoices.length} ACTIVE EXPRESSIONS</p>
        </div>
        <Link
          href="/dashboard/invoices/new"
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            padding: "16px 32px",
            background: "var(--foreground)",
            color: "var(--background)",
            textDecoration: "none",
            display: "inline-block",
            transition: "opacity 0.2s ease",
            boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)"
          }}
        >
          [+] New Expression
        </Link>
      </div>

      {isLoading ? (
        <div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ width: "100%", height: 48, marginBottom: 1 }}
            />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div style={{ paddingTop: "var(--space-block)" }}>
          <p className="empty-state">
            Nog geen facturen
          </p>
          <Link
            href="/dashboard/invoices/new"
            className="table-action"
            style={{ opacity: 0.4 }}
          >
            Maak je eerste factuur
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Abstract Headers */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr 1fr", 
            gap: 24, 
            paddingBottom: 16, 
            borderBottom: "var(--border-rule)",
            opacity: 0.2
          }}>
            <span className="label">REF</span>
            <span className="label">RECIPIENT</span>
            <span className="label">DATE</span>
            <span className="label">STATE</span>
            <span className="label" style={{ textAlign: "right" }}>SUM</span>
            <span className="label" style={{ textAlign: "right" }}>SEQ</span>
          </div>

          {/* List Items */}
          {invoices.map((invoice: InvoiceWithClient) => (
            <div 
              key={invoice.id} 
              style={{ 
                display: "grid", 
                gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr 1fr", 
                gap: 24, 
                alignItems: "center",
                padding: "24px 0",
                borderBottom: "0.5px solid rgba(0,0,0,0.03)",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.01)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Link
                href={`/dashboard/invoices/${invoice.id}`}
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 13,
                  color: "var(--foreground)",
                  fontWeight: 400,
                  textDecoration: "none",
                  opacity: 0.6
                }}
              >
                {invoice.invoice_number}
              </Link>
              
              <span style={{ fontSize: 15, fontWeight: 400, letterSpacing: "-0.01em" }}>
                {invoice.client?.name ?? "—"}
              </span>

              <span className="mono-amount" style={{ fontSize: 12, opacity: 0.4 }}>
                {formatDate(invoice.issue_date)}
              </span>

              <select
                value={invoice.status}
                onChange={(e) =>
                  statusMutation.mutate({
                    id: invoice.id,
                    status: e.target.value as InvoiceStatus,
                  })
                }
                style={{
                  width: "100%",
                  padding: "8px 0",
                  border: "none",
                  background: "transparent",
                  color: "var(--foreground)",
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  outline: "none",
                  opacity:
                    statusMutation.isPending &&
                    statusMutation.variables?.id === invoice.id
                      ? 0.2
                      : 0.5,
                  cursor: "pointer"
                }}
              >
                <option value="draft">Concept</option>
                <option value="sent">Issued</option>
                <option value="paid">Resolved</option>
                <option value="overdue">Breach</option>
              </select>

              {/* Psychology of money: Amount is minimal and monospace */}
              <span 
                style={{ 
                  textAlign: "right",
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 14,
                  fontWeight: 500,
                  opacity: invoice.status === "paid" ? 0.3 : 1
                }}
              >
                {formatCurrency(invoice.total_inc_vat)}
              </span>

              {/* Actions */}
              <div style={{ display: "flex", gap: 16, justifyContent: "flex-end", alignItems: "center" }}>
                <Link
                  href={`/dashboard/invoices/${invoice.id}/preview`}
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    textDecoration: "none",
                    color: "var(--foreground)",
                    opacity: 0.4
                  }}
                >
                  VIEW
                </Link>
                {invoice.status === "draft" && (
                  <button
                    onClick={() => {
                      if (confirm("Initiate deletion protocol?")) {
                        deleteMutation.mutate(invoice.id);
                      }
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      opacity: 0.2,
                      padding: 0,
                    }}
                  >
                    DEL
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
