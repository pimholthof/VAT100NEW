"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getInvoices, deleteInvoice, updateInvoiceStatus, type InvoiceWithClient } from "@/features/invoices/actions";
import { getQuotes, deleteQuote, updateQuoteStatus, type QuoteWithClient } from "@/features/quotes/actions";
import type { InvoiceStatus, QuoteStatus } from "@/lib/types";
import { RecurringInvoiceList } from "@/features/invoices/components/RecurringInvoiceList";
import { formatCurrency, formatDate } from "@/lib/format";
import { Th, Td, SearchFilter, TableWrapper, ConfirmDialog, useToast, EmptyState, StatusBadge, Tabs, useTabState } from "@/components/ui";
import { useLocale } from "@/lib/i18n/context";

export default function InvoicesPage() {
  const { t } = useLocale();
  const [tabParam, setActiveTab] = useTabState("facturen");
  const activeTab =
    tabParam === "offertes" || tabParam === "terugkerend" ? tabParam : "facturen";

  return (
    <div>
      <Tabs
        tabs={[
          { key: "facturen", label: t.invoices.title },
          { key: "offertes", label: t.quotes.title },
          { key: "terugkerend", label: "Terugkerend" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "facturen" ? <InvoicesTab /> : activeTab === "offertes" ? <QuotesTab /> : <RecurringInvoiceList />}
    </div>
  );
}

function InvoicesTab() {
  const { t } = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") ?? "";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [filterResetKey, setFilterResetKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleSearch = useCallback((q: string) => setSearch(q), []);
  const handleFilter = useCallback((f: Record<string, string>) => {
    setStatusFilter(f.status ?? "");
  }, []);
  // Remount van SearchFilter (via key) wist ook diens interne zoektekst.
  const clearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("");
    setFilterResetKey((k) => k + 1);
  }, []);

  const invoiceStatusOptions = [
    { value: "draft", label: t.invoices.draft },
    { value: "sent", label: t.invoices.sent },
    { value: "paid", label: t.invoices.paid },
    { value: "overdue", label: t.invoices.overdue },
  ];


  const { data: result, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["invoices", search, statusFilter],
    queryFn: () =>
      getInvoices({
        search: search || undefined,
        status: (statusFilter as InvoiceStatus) || undefined,
      }),
    // Bij zoeken/filteren blijft de vorige lijst staan i.p.v. skeletons.
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast("Factuur verwijderd");
    },
    onError: () => {
      toast("Verwijderen mislukt, probeer het opnieuw", "error");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      updateInvoiceStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast("Status bijgewerkt");
    },
    onError: () => {
      toast("Status bijwerken mislukt, probeer het opnieuw", "error");
    },
  });

  const invoices = result?.data ?? [];
  const initialLoading = isLoading && result === undefined;
  const hasActiveFilters = Boolean(search || statusFilter);

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="display-title" style={{ marginBottom: 8 }}>
            {t.invoices.title}
          </h1>
          <p className="label" style={{ opacity: 0.25 }}>{initialLoading ? "—" : `${invoices.length} ${invoices.length === 1 ? t.invoices.invoice.toUpperCase() : t.invoices.invoices.toUpperCase()}`}</p>
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
            href="/dashboard/invoices/import"
            className="btn-secondary"
          >
            {t.invoices.importInvoices}
          </Link>
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
        key={filterResetKey}
        placeholder={t.invoices.searchPlaceholder}
        filters={[
          { key: "status", label: t.invoices.allStatuses, options: invoiceStatusOptions },
        ]}
        initialFilters={filterResetKey === 0 && initialStatus ? { status: initialStatus } : undefined}
        onSearch={handleSearch}
        onFilterChange={handleFilter}
      />

      {initialLoading ? (
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
          title={hasActiveFilters ? t.invoices.noInvoicesFound : t.invoices.noInvoicesYet}
          description={hasActiveFilters ? t.invoices.noInvoicesFoundDescription : "Maak je eerste factuur aan om te beginnen."}
          actionLabel={hasActiveFilters ? t.common.clearSearchFilters : t.invoices.newInvoiceBtn}
          actionHref={hasActiveFilters ? undefined : "/dashboard/invoices/new"}
          actionOnClick={hasActiveFilters ? clearFilters : undefined}
          secondaryLabel={!hasActiveFilters ? "Bekijk een voorbeeld" : undefined}
          secondaryHref={!hasActiveFilters ? "/dashboard/voorbeeld" : undefined}
        />
      ) : (
        <TableWrapper style={{ opacity: isPlaceholderData ? 0.6 : 1, transition: "opacity 150ms ease" }}>
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
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 12, opacity: 0.4, fontVariantNumeric: "tabular-nums" }}>
                        {formatDate(invoice.issue_date)}
                      </span>
                      {(() => {
                        if (!invoice.due_date) return null;
                        if (invoice.status === "paid" || invoice.status === "draft") return null;
                        const due = new Date(invoice.due_date).setHours(0, 0, 0, 0);
                        const today = new Date().setHours(0, 0, 0, 0);
                        const days = Math.round((due - today) / 86400000);
                        if (days < 0) {
                          return (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 500,
                                color: "var(--color-accent)",
                                letterSpacing: "0.02em",
                              }}
                            >
                              {Math.abs(days)} {Math.abs(days) === 1 ? "dag" : "dagen"} te laat
                            </span>
                          );
                        }
                        if (days <= 7) {
                          return (
                            <span
                              style={{
                                fontSize: 11,
                                opacity: 0.55,
                                letterSpacing: "0.02em",
                              }}
                            >
                              Vervalt {days === 0 ? "vandaag" : days === 1 ? "morgen" : `over ${days} dagen`}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
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
  const [filterResetKey, setFilterResetKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleSearch = useCallback((q: string) => setSearch(q), []);
  const handleFilter = useCallback((f: Record<string, string>) => {
    setStatusFilter(f.status ?? "");
  }, []);
  const clearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("");
    setFilterResetKey((k) => k + 1);
  }, []);

  const quoteStatusOptions = [
    { value: "draft", label: t.quotes.draft },
    { value: "sent", label: t.quotes.sent },
    { value: "accepted", label: t.quotes.accepted },
    { value: "invoiced", label: t.quotes.invoiced },
    { value: "rejected", label: t.quotes.rejected },
  ];

  const { data: result, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["quotes", search, statusFilter],
    queryFn: () =>
      getQuotes({
        search: search || undefined,
        status: (statusFilter as QuoteStatus) || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast("Offerte verwijderd");
    },
    onError: () => {
      toast("Verwijderen mislukt, probeer het opnieuw", "error");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuoteStatus }) =>
      updateQuoteStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast("Status bijgewerkt");
    },
    onError: () => {
      toast("Status bijwerken mislukt, probeer het opnieuw", "error");
    },
  });

  const quotes = result?.data ?? [];
  const initialLoading = isLoading && result === undefined;
  const hasActiveFilters = Boolean(search || statusFilter);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="display-title" style={{ marginBottom: 8 }}>
            {t.quotes.title}
          </h1>
          <p className="label" style={{ opacity: 0.3 }}>{initialLoading ? "—" : `${quotes.length} ${quotes.length === 1 ? t.quotes.quote.toUpperCase() : t.quotes.title.toUpperCase()}`}</p>
        </div>
        <Link
          href="/dashboard/quotes/new"
          className="btn-primary"
        >
          {t.quotes.newQuoteBtn}
        </Link>
      </div>

      <SearchFilter
        key={filterResetKey}
        placeholder={t.invoices.searchPlaceholder}
        filters={[
          { key: "status", label: t.invoices.allStatuses, options: quoteStatusOptions },
        ]}
        onSearch={handleSearch}
        onFilterChange={handleFilter}
      />

      {initialLoading ? (
        <div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton" style={{ width: "100%", height: 48, marginBottom: 1 }} />
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <EmptyState
          icon="◇"
          title={hasActiveFilters ? t.quotes.noQuotesFound : t.quotes.noQuotesYet}
          description={hasActiveFilters ? t.quotes.noQuotesFoundDescription : "Stuur een offerte naar je klant."}
          actionLabel={hasActiveFilters ? t.common.clearSearchFilters : t.quotes.newQuoteBtn}
          actionHref={hasActiveFilters ? undefined : "/dashboard/quotes/new"}
          actionOnClick={hasActiveFilters ? clearFilters : undefined}
        />
      ) : (
        <TableWrapper style={{ opacity: isPlaceholderData ? 0.6 : 1, transition: "opacity 150ms ease" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
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
