"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInvoices, deleteInvoice, updateInvoiceStatus, type InvoiceWithClient } from "@/lib/actions/invoices";
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
      {/* Paginakop */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="display-title">Facturen</h1>
            <p className="page-header-count">
              {invoices.length} {invoices.length === 1 ? "factuur" : "facturen"}
            </p>
          </div>
          <Link href="/dashboard/invoices/new" className="action-button">
            + Nieuwe factuur
          </Link>
        </div>
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
        <div>
          <p className="empty-state">Nog geen facturen</p>
          <Link
            href="/dashboard/invoices/new"
            className="table-action"
            style={{ opacity: 0.4 }}
          >
            Maak je eerste factuur
          </Link>
        </div>
      ) : (
        <div className="data-table">
          {/* Koprij */}
          <div
            className="data-table-header invoice-grid"
          >
            <span>Ref</span>
            <span>Klant</span>
            <span>Datum</span>
            <span>Status</span>
            <span style={{ textAlign: "right" }}>Bedrag</span>
            <span style={{ textAlign: "right" }}>Acties</span>
          </div>

          {/* Rijen */}
          {invoices.map((invoice: InvoiceWithClient) => {
            const statusLabel = {
              draft: "Concept",
              sent: "Verzonden",
              paid: "Betaald",
              overdue: "Te laat",
            }[invoice.status] ?? invoice.status;

            const statusType = {
              draft: "draft",
              sent: "active",
              paid: "paid",
              overdue: "overdue",
            }[invoice.status] ?? "draft";

            return (
              <div
                key={invoice.id}
                className="data-table-row invoice-grid"
              >
                <Link
                  href={`/dashboard/invoices/${invoice.id}`}
                  className="mono-amount"
                  style={{
                    fontSize: 12,
                    color: "var(--foreground)",
                    textDecoration: "none",
                    opacity: 0.5,
                  }}
                >
                  {invoice.invoice_number}
                </Link>

                <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.01em" }}>
                  {invoice.client?.name ?? "—"}
                </span>

                <span className="mono-amount" style={{ fontSize: 12, opacity: 0.4 }}>
                  {formatDate(invoice.issue_date)}
                </span>

                <span className="label" style={{ margin: 0, opacity: 0.5 }}>
                  <span className="status-dot" data-status={statusType} />
                  <select
                    value={invoice.status}
                    onChange={(e) =>
                      statusMutation.mutate({
                        id: invoice.id,
                        status: e.target.value as InvoiceStatus,
                      })
                    }
                    style={{
                      padding: 0,
                      border: "none",
                      background: "transparent",
                      color: "var(--foreground)",
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "var(--text-label)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "var(--tracking-label)",
                      outline: "none",
                      opacity:
                        statusMutation.isPending &&
                        statusMutation.variables?.id === invoice.id
                          ? 0.2
                          : 1,
                      cursor: "pointer",
                    }}
                  >
                    <option value="draft">Concept</option>
                    <option value="sent">Verzonden</option>
                    <option value="paid">Betaald</option>
                    <option value="overdue">Te laat</option>
                  </select>
                </span>

                <span
                  className="mono-amount"
                  style={{
                    textAlign: "right",
                    fontSize: 14,
                    fontWeight: 500,
                    opacity: invoice.status === "paid" ? 0.3 : 1,
                  }}
                >
                  {formatCurrency(invoice.total_inc_vat)}
                </span>

                <div style={{ display: "flex", gap: 16, justifyContent: "flex-end", alignItems: "center" }}>
                  <Link
                    href={`/dashboard/invoices/${invoice.id}/preview`}
                    className="table-action"
                    style={{ opacity: 0.4 }}
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
                      className="table-action"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        opacity: 0.2,
                        padding: 0,
                      }}
                    >
                      Verwijder
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
