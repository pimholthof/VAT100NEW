"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInvoices, deleteInvoice, updateInvoiceStatus, type InvoiceWithClient } from "@/features/invoices/actions";
import type { InvoiceStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { Th, Td, SearchFilter, TableWrapper, ConfirmDialog } from "@/components/ui";

const STATUS_OPTIONS = [
  { value: "draft", label: "Concept" },
  { value: "sent", label: "Verzonden" },
  { value: "paid", label: "Betaald" },
  { value: "overdue", label: "Te laat" },
];

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleSearch = useCallback((q: string) => setSearch(q), []);
  const handleFilter = useCallback((f: Record<string, string>) => {
    setStatusFilter(f.status ?? "");
  }, []);

  const { data: result, isLoading } = useQuery({
    queryKey: ["invoices", search, statusFilter],
    queryFn: () =>
      getInvoices({
        search: search || undefined,
        status: (statusFilter as InvoiceStatus) || undefined,
      }),
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
      <div className="page-header">
        <div>
          <h1 className="display-title" style={{ letterSpacing: "-0.04em", marginBottom: 8 }}>
            Facturen
          </h1>
          <p className="label" style={{ opacity: 0.3 }}>{invoices.length} FACTUREN</p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a
            href="/api/export/invoices"
            download
            className="label-strong"
            style={{
              padding: "16px 24px",
              border: "0.5px solid rgba(13,13,11,0.25)",
              background: "transparent",
              color: "var(--foreground)",
              textDecoration: "none",
              display: "inline-block",
              transition: "opacity 0.2s ease",
            }}
          >
            Exporteer CSV
          </a>
          <Link
            href="/dashboard/invoices/new"
            className="label-strong"
            style={{
              padding: "16px 32px",
              background: "var(--foreground)",
              color: "var(--background)",
              textDecoration: "none",
              display: "inline-block",
              transition: "opacity 0.2s ease",
            }}
          >
            + Nieuwe factuur
          </Link>
        </div>
      </div>

      {/* Search & Filter */}
      <SearchFilter
        placeholder="Zoek op nummer, klant of bedrag..."
        filters={[
          { key: "status", label: "Alle statussen", options: STATUS_OPTIONS },
        ]}
        onSearch={handleSearch}
        onFilterChange={handleFilter}
      />

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
            {search || statusFilter ? "Geen facturen gevonden" : "Nog geen facturen"}
          </p>
          {!search && !statusFilter && (
            <Link
              href="/dashboard/invoices/new"
              className="table-action"
              style={{ opacity: 0.4 }}
            >
              Maak je eerste factuur
            </Link>
          )}
        </div>
      ) : (
        <TableWrapper><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
          <thead>
            <tr style={{ borderBottom: "var(--border-rule)", textAlign: "left" }}>
              <Th>Ref</Th>
              <Th>Klant</Th>
              <Th>Datum</Th>
              <Th>Status</Th>
              <Th style={{ textAlign: "right" }}>Bedrag</Th>
              <Th style={{ textAlign: "right" }}>Acties</Th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice: InvoiceWithClient) => (
              <tr key={invoice.id} style={{ borderBottom: "0.5px solid rgba(0,0,0,0.03)" }}>
                <Td>
                  <Link
                    href={`/dashboard/invoices/${invoice.id}`}
                    style={{
                      fontSize: 13,
                      color: "var(--foreground)",
                      textDecoration: "none",
                      opacity: 0.6
                    }}
                  >
                    {invoice.invoice_number}
                    {invoice.is_credit_note && (
                      <span style={{
                        marginLeft: 8,
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--color-accent)",
                      }}>
                        Credit
                      </span>
                    )}
                  </Link>
                </Td>
                <Td>{invoice.client?.name ?? "—"}</Td>
                <Td>
                  <span className="mono-amount" style={{ fontSize: 12, opacity: 0.4 }}>
                    {formatDate(invoice.issue_date)}
                  </span>
                </Td>
                <Td>
                  <select
                    value={invoice.status}
                    aria-label={`Status ${invoice.invoice_number}`}
                    aria-busy={statusMutation.isPending && statusMutation.variables?.id === invoice.id}
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
                    <option value="sent">Verzonden</option>
                    <option value="paid">Betaald</option>
                    <option value="overdue">Te laat</option>
                  </select>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      fontVariantNumeric: "tabular-nums",
                      opacity: invoice.status === "paid" ? 0.3 : 1
                    }}
                  >
                    {formatCurrency(invoice.total_inc_vat)}
                  </span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                    <Link
                      href={`/dashboard/invoices/${invoice.id}/preview`}
                      className="table-action"
                    >
                      Bekijk
                    </Link>
                    {invoice.status === "draft" && (
                      <button
                        onClick={() => setDeleteTarget(invoice.id)}
                        className="table-action"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          opacity: 0.3,
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
        </table></TableWrapper>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Factuur verwijderen"
        message="Weet je zeker dat je deze factuur wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
        confirmLabel="Verwijderen"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
