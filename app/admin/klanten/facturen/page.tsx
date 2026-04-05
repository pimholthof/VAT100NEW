"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getPlatformInvoices } from "@/features/admin/actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { AdminStatePanel } from "../../AdminStatePanel";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(dateStr));
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Concept",
  sent: "Verzonden",
  paid: "Betaald",
  overdue: "Te laat",
};

const STATUS_CLASSES: Record<string, string> = {
  draft: "admin-badge admin-badge-neutral",
  sent: "admin-badge admin-badge-warning",
  paid: "admin-badge admin-badge-success",
  overdue: "admin-badge admin-badge-critical",
};

export default function AdminKlantenFacturenPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-platform-invoices", search, statusFilter, page],
    queryFn: () => getPlatformInvoices({ search, status: statusFilter, page, pageSize }),
  });

  const invoices = result?.data?.invoices ?? [];
  const total = result?.data?.total ?? 0;
  const stats = result?.data?.stats;
  const totalPages = Math.ceil(total / pageSize);

  if (result?.error) {
    return (
      <div className="admin-layout">
        <PageHeader title="Facturen" backHref="/admin/klanten" backLabel="Klanten" />
        <AdminStatePanel eyebrow="Facturen" title="Kon niet worden geladen" description={result.error} actions={[{ href: "/admin/klanten", label: "Terug", variant: "secondary" }]} />
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <PageHeader title="Facturen" backHref="/admin/klanten" backLabel="Klanten" />

      {/* KPI Strip */}
      {stats && (
        <div className="admin-stat-grid">
          <StatCard label="Totaal" value={String(stats.total)} numericValue={stats.total} isCurrency={false} sub={`${stats.draft} concept`} compact />
          <StatCard label="Verzonden" value={String(stats.sent)} numericValue={stats.sent} isCurrency={false} sub={formatCurrency(stats.totalOpen)} compact />
          <StatCard label="Betaald" value={String(stats.paid)} numericValue={stats.paid} isCurrency={false} sub={formatCurrency(stats.totalRevenue)} compact />
          <StatCard label="Te laat" value={String(stats.overdue)} numericValue={stats.overdue} isCurrency={false} sub={formatCurrency(stats.totalOverdue)} compact />
          <StatCard label="Omzet (betaald)" value={formatCurrency(stats.totalRevenue)} numericValue={stats.totalRevenue} compact />
          <StatCard label="Openstaand" value={formatCurrency(stats.totalOpen + stats.totalOverdue)} numericValue={stats.totalOpen + stats.totalOverdue} compact />
        </div>
      )}

      {/* Filters */}
      <div className="admin-toolbar">
        <input
          type="text"
          placeholder="Zoek op factuurnummer..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="admin-field mono-amount"
        />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="admin-select label">
          <option value="all">Alle statussen</option>
          <option value="draft">Concept</option>
          <option value="sent">Verzonden</option>
          <option value="paid">Betaald</option>
          <option value="overdue">Te laat</option>
        </select>
      </div>

      <div className="admin-summary-row">
        <p className="label">{total} factu{total !== 1 ? "ren" : "ur"} gevonden</p>
        <p className="label">Pagina {page}{totalPages > 0 ? ` van ${totalPages}` : ""}</p>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="admin-table-shell"><div className="admin-empty-state">Laden...</div></div>
      ) : invoices.length === 0 ? (
        <div className="admin-table-shell"><div className="admin-empty-state">Geen facturen gevonden</div></div>
      ) : (
        <div className="admin-table-shell">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  {["Nummer", "Gebruiker", "Klant", "Status", "Betaling", "Datum", "Vervaldatum", "Bedrag"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="mono-amount">
                      {inv.invoice_number}
                      {inv.is_credit_note && <span className="admin-badge admin-badge-neutral" style={{ marginLeft: 4 }}>CN</span>}
                    </td>
                    <td>
                      <Link href={`/admin/klanten/${inv.user_id}`} className="admin-primary-link">
                        {inv.user_name}
                      </Link>
                    </td>
                    <td>{inv.client_name}</td>
                    <td>
                      <span className={STATUS_CLASSES[inv.status] ?? "admin-badge"}>
                        {STATUS_LABELS[inv.status] ?? inv.status}
                      </span>
                    </td>
                    <td className="label">
                      {inv.mollie_payment_id ? (
                        <span className="admin-badge admin-badge-success">Mollie</span>
                      ) : inv.payment_method ? (
                        <span className="admin-badge admin-badge-neutral">{inv.payment_method}</span>
                      ) : (
                        <span style={{ opacity: 0.3 }}>&mdash;</span>
                      )}
                    </td>
                    <td className="label">{formatDate(inv.issue_date)}</td>
                    <td className="label">{inv.due_date ? formatDate(inv.due_date) : "\u2014"}</td>
                    <td className="mono-amount admin-right">{formatCurrency(inv.total_inc_vat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="admin-pagination">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="admin-page-button">Vorige</button>
          <span className="admin-page-button label">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="admin-page-button">Volgende</button>
        </div>
      )}
    </div>
  );
}
