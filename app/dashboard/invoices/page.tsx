"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInvoices, deleteInvoice, updateInvoiceStatus, type InvoiceWithClient } from "@/features/invoices/actions";
import { getQuotes, deleteQuote, updateQuoteStatus, type QuoteWithClient } from "@/features/quotes/actions";
import type { InvoiceStatus, QuoteStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { Th, Td, SearchFilter, TableWrapper, ConfirmDialog } from "@/components/ui";

const INVOICE_STATUS_OPTIONS = [
  { value: "draft", label: "Concept" },
  { value: "sent", label: "Verzonden" },
  { value: "paid", label: "Betaald" },
  { value: "overdue", label: "Te laat" },
];

const STATUS_LABELS: Record<string, string> = {
  draft: "Concept",
  sent: "Verzonden",
  paid: "Betaald",
  overdue: "Te laat",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ideal: "iDEAL",
  creditcard: "Creditcard",
  banktransfer: "Bankoverschrijving",
  paypal: "PayPal",
  applepay: "Apple Pay",
  online: "Online",
};

const QUOTE_STATUS_OPTIONS = [
  { value: "draft", label: "Concept" },
  { value: "sent", label: "Verstuurd" },
  { value: "accepted", label: "Geaccepteerd" },
  { value: "invoiced", label: "Gefactureerd" },
  { value: "rejected", label: "Afgewezen" },
];

const tabStyle = (active: boolean): React.CSSProperties => ({
  background: "none",
  border: "none",
  borderBottom: active ? "2px solid var(--foreground)" : "2px solid transparent",
  padding: "0 0 8px 0",
  fontSize: "var(--text-body-lg)",
  fontWeight: active ? 500 : 300,
  color: "var(--foreground)",
  opacity: active ? 1 : 0.5,
  cursor: "pointer",
});

export default function InvoicesPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "offertes" ? "offertes" : "facturen";
  const [activeTab, setActiveTab] = useState<"facturen" | "offertes">(initialTab);

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: "24px", marginBottom: "40px", borderBottom: "0.5px solid rgba(13,13,11,0.12)" }}>
        <button onClick={() => setActiveTab("facturen")} style={tabStyle(activeTab === "facturen")}>
          Facturen
        </button>
        <button onClick={() => setActiveTab("offertes")} style={tabStyle(activeTab === "offertes")}>
          Offertes
        </button>
      </div>

      {activeTab === "facturen" ? <InvoicesTab /> : <QuotesTab />}
    </div>
  );
}

function InvoicesTab() {
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
          <h1 className="display-title" style={{ marginBottom: 8 }}>
            Facturen
          </h1>
          <p className="label" style={{ opacity: 0.25 }}>{invoices.length} {invoices.length === 1 ? "FACTUUR" : "FACTUREN"}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a
            href="/api/export/invoices"
            download
            className="btn-secondary"
          >
            Download lijst
          </a>
          <Link
            href="/dashboard/invoices/new"
            className="btn-primary"
          >
            + Nieuwe factuur
          </Link>
        </div>
      </div>

      {/* Search & Filter */}
      <SearchFilter
        placeholder="Zoek op nummer, klant of bedrag..."
        filters={[
          { key: "status", label: "Alle statussen", options: INVOICE_STATUS_OPTIONS },
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
        <div style={{ paddingTop: "var(--space-xl)" }}>
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
        <TableWrapper>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid rgba(0,0,0,0.08)" }}>
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
                        opacity: 0.6,
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
                    <span style={{ fontSize: 12, opacity: 0.4, fontVariantNumeric: "tabular-nums" }}>
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
                        padding: "6px 0",
                        border: "none",
                        background: "transparent",
                        color: invoice.status === "overdue" ? "var(--color-accent)" : "var(--foreground)",
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        fontWeight: 600,
                        outline: "none",
                        opacity:
                          statusMutation.isPending &&
                          statusMutation.variables?.id === invoice.id
                            ? 0.15
                            : invoice.status === "paid" ? 0.3 : 0.5,
                        cursor: "pointer",
                      }}
                    >
                      <option value="draft">{STATUS_LABELS.draft}</option>
                      <option value="sent">{STATUS_LABELS.sent}</option>
                      <option value="paid">{STATUS_LABELS.paid}</option>
                      <option value="overdue">{STATUS_LABELS.overdue}</option>
                    </select>
                    {invoice.status === "paid" && invoice.payment_method && (
                      <span style={{ fontSize: 10, opacity: 0.35, marginLeft: 4 }}>
                        via {PAYMENT_METHOD_LABELS[invoice.payment_method] ?? invoice.payment_method}
                      </span>
                    )}
                    {invoice.status !== "paid" && invoice.status !== "draft" && invoice.payment_link && (
                      <span style={{ fontSize: 10, opacity: 0.35, marginLeft: 4 }}>
                        betaallink
                      </span>
                    )}
                  </Td>
                  <Td style={{ textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        fontVariantNumeric: "tabular-nums",
                        opacity: invoice.status === "paid" ? 0.3 : 1,
                        color: invoice.status === "overdue" ? "var(--color-accent)" : "var(--foreground)",
                      }}
                    >
                      {formatCurrency(invoice.total_inc_vat)}
                    </span>
                  </Td>
                  <Td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
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
                            opacity: 0.25,
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
        </TableWrapper>
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

function QuotesTab() {
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
          <h1 className="display-title" style={{ marginBottom: 8 }}>
            Offertes
          </h1>
          <p className="label" style={{ opacity: 0.3 }}>{quotes.length} {quotes.length === 1 ? "OFFERTE" : "OFFERTES"}</p>
        </div>
        <Link
          href="/dashboard/quotes/new"
          className="btn-primary"
        >
          + Nieuwe offerte
        </Link>
      </div>

      <SearchFilter
        placeholder="Zoek op nummer, klant of bedrag..."
        filters={[
          { key: "status", label: "Alle statussen", options: QUOTE_STATUS_OPTIONS },
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
                    {QUOTE_STATUS_OPTIONS.map((opt) => (
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
                        onClick={() => setDeleteTarget(quote.id)}
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
