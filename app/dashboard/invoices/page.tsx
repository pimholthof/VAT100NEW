"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInvoices, deleteInvoice, updateInvoiceStatus, type InvoiceWithClient } from "@/features/invoices/actions";
import { getQuotes, deleteQuote, updateQuoteStatus, type QuoteWithClient } from "@/features/quotes/actions";
import type { InvoiceStatus, QuoteStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { Th, Td, SearchFilter, TableWrapper, ConfirmDialog, useToast, EmptyState, StatusBadge } from "@/components/ui";
import { useLocale } from "@/lib/i18n/context";

const tabStyle = (active: boolean): React.CSSProperties => ({
  background: "none",
  border: "none",
  borderBottom: active ? "1.5px solid var(--foreground)" : "1.5px solid transparent",
  padding: "0 0 12px 0",
  fontSize: 14,
  fontWeight: active ? 600 : 400,
  color: "var(--foreground)",
  opacity: active ? 1 : 0.4,
  cursor: "pointer",
  letterSpacing: "-0.01em",
  transition: "opacity 0.2s ease",
});

export default function InvoicesPage() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "offertes" ? "offertes" : "facturen";
  const [activeTab, setActiveTab] = useState<"facturen" | "offertes">(initialTab);

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 28, marginBottom: 40, borderBottom: "0.5px solid rgba(0, 0, 0, 0.08)" }}>
        <button onClick={() => setActiveTab("facturen")} style={tabStyle(activeTab === "facturen")}>
          {t.invoices.title}
        </button>
        <button onClick={() => setActiveTab("offertes")} style={tabStyle(activeTab === "offertes")}>
          {t.quotes.title}
        </button>
      </div>

      {activeTab === "facturen" ? <InvoicesTab /> : <QuotesTab />}
    </div>
  );
}

function InvoicesTab() {
  const { t } = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleSearch = useCallback((q: string) => setSearch(q), []);
  const handleFilter = useCallback((f: Record<string, string>) => {
    setStatusFilter(f.status ?? "");
  }, []);

  const invoiceStatusOptions = [
    { value: "draft", label: t.invoices.draft },
    { value: "sent", label: t.invoices.sent },
    { value: "paid", label: t.invoices.paid },
    { value: "overdue", label: t.invoices.overdue },
  ];


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
      toast("Factuur verwijderd");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      updateInvoiceStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast("Status bijgewerkt");
    },
  });

  const invoices = result?.data ?? [];

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="display-title" style={{ marginBottom: 8 }}>
            {t.invoices.title}
          </h1>
          <p className="label" style={{ opacity: 0.25 }}>{invoices.length} {invoices.length === 1 ? t.invoices.invoice.toUpperCase() : t.invoices.invoices.toUpperCase()}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a
            href="/api/export/invoices"
            download
            className="btn-secondary"
          >
            {t.common.downloadList}
          </a>
          <Link
            href="/dashboard/invoices/new"
            className="btn-primary"
          >
            {t.invoices.newInvoiceBtn}
          </Link>
        </div>
      </div>

      {/* Search & Filter */}
      <SearchFilter
        placeholder={t.invoices.searchPlaceholder}
        filters={[
          { key: "status", label: t.invoices.allStatuses, options: invoiceStatusOptions },
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
        <EmptyState
          icon="□"
          title={search || statusFilter ? t.invoices.noInvoicesFound : t.invoices.noInvoicesYet}
          description={!search && !statusFilter ? "Maak je eerste factuur aan om te beginnen." : undefined}
          actionLabel={!search && !statusFilter ? t.invoices.newInvoiceBtn : undefined}
          actionHref={!search && !statusFilter ? "/dashboard/invoices/new" : undefined}
        />
      ) : (
        <TableWrapper>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid rgba(0,0,0,0.08)" }}>
                <Th>{t.common.ref}</Th>
                <Th>{t.invoices.client}</Th>
                <Th>{t.common.date}</Th>
                <Th>{t.common.status}</Th>
                <Th style={{ textAlign: "right" }}>{t.common.amount}</Th>
                <Th style={{ textAlign: "right" }}>{t.common.actions}</Th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice: InvoiceWithClient) => (
                <tr key={invoice.id} className="table-row-interactive" style={{ borderBottom: "0.5px solid rgba(0,0,0,0.03)" }}>
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
                          {t.invoices.credit}
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
                    <StatusBadge
                      value={invoice.status}
                      options={invoiceStatusOptions}
                      onChange={(status) =>
                        statusMutation.mutate({
                          id: invoice.id,
                          status: status as InvoiceStatus,
                        })
                      }
                      disabled={statusMutation.isPending && statusMutation.variables?.id === invoice.id}
                      ariaLabel={`${t.common.status} ${invoice.invoice_number}`}
                    />
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
                    <div className="table-row-actions" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <Link
                        href={`/dashboard/invoices/${invoice.id}/preview`}
                        className="table-action"
                      >
                        {t.common.view}
                      </Link>
                      {invoice.status === "draft" && (
                        <button
                          onClick={() => setDeleteTarget(invoice.id)}
                          className="table-action"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          {t.common.delete}
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
        title={t.invoices.deleteTitle}
        message={t.invoices.deleteMessage}
        confirmLabel={t.common.delete}
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
  const { t } = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleSearch = useCallback((q: string) => setSearch(q), []);
  const handleFilter = useCallback((f: Record<string, string>) => {
    setStatusFilter(f.status ?? "");
  }, []);

  const quoteStatusOptions = [
    { value: "draft", label: t.quotes.draft },
    { value: "sent", label: t.quotes.sent },
    { value: "accepted", label: t.quotes.accepted },
    { value: "invoiced", label: t.quotes.invoiced },
    { value: "rejected", label: t.quotes.rejected },
  ];

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
      toast("Offerte verwijderd");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuoteStatus }) =>
      updateQuoteStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast("Status bijgewerkt");
    },
  });

  const quotes = result?.data ?? [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="display-title" style={{ marginBottom: 8 }}>
            {t.quotes.title}
          </h1>
          <p className="label" style={{ opacity: 0.3 }}>{quotes.length} {quotes.length === 1 ? t.quotes.quote.toUpperCase() : t.quotes.title.toUpperCase()}</p>
        </div>
        <Link
          href="/dashboard/quotes/new"
          className="btn-primary"
        >
          {t.quotes.newQuoteBtn}
        </Link>
      </div>

      <SearchFilter
        placeholder={t.invoices.searchPlaceholder}
        filters={[
          { key: "status", label: t.invoices.allStatuses, options: quoteStatusOptions },
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
        <EmptyState
          icon="◇"
          title={search || statusFilter ? t.quotes.noQuotesFound : t.quotes.noQuotesYet}
          description={!search && !statusFilter ? "Stuur een offerte naar je klant." : undefined}
          actionLabel={!search && !statusFilter ? t.quotes.newQuoteBtn : undefined}
          actionHref={!search && !statusFilter ? "/dashboard/quotes/new" : undefined}
        />
      ) : (
        <TableWrapper><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
          <thead>
            <tr style={{ borderBottom: "var(--border-rule)", textAlign: "left" }}>
              <Th>{t.common.ref}</Th>
              <Th>{t.invoices.client}</Th>
              <Th>{t.common.date}</Th>
              <Th>{t.common.status}</Th>
              <Th style={{ textAlign: "right" }}>{t.common.amount}</Th>
              <Th style={{ textAlign: "right" }}>{t.common.actions}</Th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote: QuoteWithClient) => (
              <tr key={quote.id} className="table-row-interactive" style={{ borderBottom: "0.5px solid rgba(0,0,0,0.03)" }}>
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
                  <StatusBadge
                    value={quote.status}
                    options={quoteStatusOptions}
                    onChange={(status) =>
                      statusMutation.mutate({ id: quote.id, status: status as QuoteStatus })
                    }
                    disabled={statusMutation.isPending && statusMutation.variables?.id === quote.id}
                    ariaLabel={`${t.common.status} ${quote.quote_number}`}
                  />
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
                  <div className="table-row-actions" style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                    <Link href={`/dashboard/quotes/${quote.id}`} className="table-action">
                      {t.common.view}
                    </Link>
                    {quote.status === "draft" && (
                      <button
                        onClick={() => setDeleteTarget(quote.id)}
                        className="table-action"
                        style={{ background: "none", border: "none", cursor: "pointer" }}
                      >
                        {t.common.delete}
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
        title={t.quotes.deleteTitle}
        message={t.quotes.deleteMessage}
        confirmLabel={t.common.delete}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
