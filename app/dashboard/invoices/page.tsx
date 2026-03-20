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
              className="skeleton w-full h-[48px] mb-px"
            />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div>
          <p className="empty-state">Nog geen facturen</p>
          <Link
            href="/dashboard/invoices/new"
            className="table-action opacity-40"
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
            <span className="text-right">Bedrag</span>
            <span className="text-right">Acties</span>
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
                  className="mono-amount text-[12px] text-[var(--foreground)] no-underline opacity-50"
                >
                  {invoice.invoice_number}
                </Link>

                <span className="text-[14px] font-medium tracking-[-0.01em]">
                  {invoice.client?.name ?? "—"}
                </span>

                <span className="mono-amount text-[12px] opacity-40">
                  {formatDate(invoice.issue_date)}
                </span>

                <span className="label !m-0 opacity-50">
                  <span className="status-dot" data-status={statusType} />
                  <select
                    value={invoice.status}
                    onChange={(e) =>
                      statusMutation.mutate({
                        id: invoice.id,
                        status: e.target.value as InvoiceStatus,
                      })
                    }
                    className={`p-0 border-none bg-transparent text-[var(--foreground)] font-sans text-[var(--text-label)] font-semibold uppercase tracking-[var(--tracking-label)] outline-none cursor-pointer ${
                      statusMutation.isPending &&
                      statusMutation.variables?.id === invoice.id
                        ? "opacity-20"
                        : "opacity-100"
                    }`}
                  >
                    <option value="draft">Concept</option>
                    <option value="sent">Verzonden</option>
                    <option value="paid">Betaald</option>
                    <option value="overdue">Te laat</option>
                  </select>
                </span>

                <span
                  className={`mono-amount text-right text-[14px] font-medium ${
                    invoice.status === "paid" ? "opacity-30" : "opacity-100"
                  }`}
                >
                  {formatCurrency(invoice.total_inc_vat)}
                </span>

                <div className="flex gap-4 justify-end items-center">
                  <Link
                    href={`/dashboard/invoices/${invoice.id}/preview`}
                    className="table-action opacity-40"
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
                      className="table-action bg-none border-none cursor-pointer opacity-20 p-0"
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
