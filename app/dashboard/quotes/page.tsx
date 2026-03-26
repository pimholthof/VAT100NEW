"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQuotes, deleteQuote, updateQuoteStatus, type QuoteWithClient } from "@/features/quotes/actions";
import type { QuoteStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { Th, Td, SearchFilter, TableWrapper, ConfirmDialog } from "@/components/ui";

const STATUS_OPTIONS = [
  { value: "draft", label: "Concept" },
  { value: "sent", label: "Verstuurd" },
  { value: "accepted", label: "Geaccepteerd" },
  { value: "invoiced", label: "Gefactureerd" },
  { value: "rejected", label: "Afgewezen" },
];

export default function QuotesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleSearch = useCallback((q: string) => setSearch(q), []);
  const handleFilter = useCallback((f: Record<string, string>) => {
    setStatusFilter(f.status ?? "");
  }, []);

  const { data: result, isLoading } = useQuery({
    queryKey: ["quotes", search, statusFilter],
    queryFn: () =>
      getQuotes({
        search: search || undefined,
        status: (statusFilter as QuoteStatus) || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuoteStatus }) =>
      updateQuoteStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });

  const quotes = result?.data ?? [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="display-title" style={{ letterSpacing: "-0.04em", marginBottom: 8 }}>
            Offertes
          </h1>
          <p className="label" style={{ opacity: 0.3 }}>{quotes.length} OFFERTES</p>
        </div>
        <Link
          href="/dashboard/quotes/new"
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
          + Nieuwe offerte
        </Link>
      </div>

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
            <div key={i} className="skeleton" style={{ width: "100%", height: 48, marginBottom: 1 }} />
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <div style={{ paddingTop: "var(--space-block)" }}>
          <p className="empty-state">
            {search || statusFilter ? "Geen offertes gevonden" : "Nog geen offertes"}
          </p>
          {!search && !statusFilter && (
            <Link href="/dashboard/quotes/new" className="table-action" style={{ opacity: 0.4 }}>
              Maak je eerste offerte
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
            {quotes.map((quote: QuoteWithClient) => (
              <tr key={quote.id} style={{ borderBottom: "0.5px solid rgba(0,0,0,0.03)" }}>
                <Td>
                  <Link
                    href={`/dashboard/quotes/${quote.id}`}
                    style={{ fontSize: 13, color: "var(--foreground)", textDecoration: "none", opacity: 0.6 }}
                  >
                    {quote.quote_number}
                  </Link>
                </Td>
                <Td>{quote.client?.name ?? "—"}</Td>
                <Td>
                  <span className="mono-amount" style={{ fontSize: 12, opacity: 0.4 }}>
                    {formatDate(quote.issue_date)}
                  </span>
                </Td>
                <Td>
                  <select
                    value={quote.status}
                    aria-label={`Status ${quote.quote_number}`}
                    aria-busy={statusMutation.isPending && statusMutation.variables?.id === quote.id}
                    onChange={(e) =>
                      statusMutation.mutate({ id: quote.id, status: e.target.value as QuoteStatus })
                    }
                    style={{
                      width: "100%", padding: "8px 0", border: "none", background: "transparent",
                      color: "var(--foreground)", fontSize: 11, textTransform: "uppercase",
                      letterSpacing: "0.1em", outline: "none",
                      opacity: statusMutation.isPending && statusMutation.variables?.id === quote.id ? 0.2 : 0.5,
                      cursor: "pointer"
                    }}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span style={{
                    fontSize: 14, fontWeight: 500, fontVariantNumeric: "tabular-nums",
                    opacity: quote.status === "invoiced" || quote.status === "rejected" ? 0.3 : 1,
                    color: quote.status === "accepted" ? "rgba(0,128,0,0.7)" : quote.status === "rejected" ? "var(--color-accent)" : "var(--foreground)",
                  }}>
                    {formatCurrency(quote.total_inc_vat)}
                  </span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                    <Link href={`/dashboard/quotes/${quote.id}`} className="table-action">
                      Bekijk
                    </Link>
                    {quote.status === "draft" && (
                      <button
                        onClick={() => {
                          setDeleteTarget(quote.id);
                        }}
                        className="table-action"
                        style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.3 }}
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
        title="Offerte verwijderen"
        message="Weet je zeker dat je deze offerte wilt verwijderen?"
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
