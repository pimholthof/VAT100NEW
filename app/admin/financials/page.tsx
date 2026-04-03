"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getPlatformInvoices, getPlatformExpenses } from "@/features/admin/actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { AdminStatePanel } from "../AdminStatePanel";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
}

export default function AdminFinancialsPage() {
  const { data: invoiceResult, isLoading: loadingInvoices } = useQuery({
    queryKey: ["admin-financials-invoices"],
    queryFn: () => getPlatformInvoices({ pageSize: 1 }),
  });

  const { data: expenseResult, isLoading: loadingExpenses } = useQuery({
    queryKey: ["admin-financials-expenses"],
    queryFn: getPlatformExpenses,
  });

  const isLoading = loadingInvoices || loadingExpenses;
  const invoiceStats = invoiceResult?.data?.stats;
  const expenses = expenseResult?.data;

  if (invoiceResult?.error || expenseResult?.error) {
    return (
      <div className="admin-layout">
        <PageHeader title="Financieel" backHref="/admin" backLabel="Command Center" />
        <AdminStatePanel eyebrow="Financieel" title="Kon niet worden geladen" description={invoiceResult?.error ?? expenseResult?.error ?? "Fout"} actions={[{ href: "/admin", label: "Terug", variant: "secondary" }]} />
      </div>
    );
  }

  const totalRevenue = invoiceStats?.totalRevenue ?? 0;
  const totalExpenses = expenses?.totalExpenseAmount ?? 0;
  const margin = totalRevenue - totalExpenses;
  const marginPct = totalRevenue > 0 ? Math.round((margin / totalRevenue) * 100) : 0;

  return (
    <div className="admin-layout">
      <PageHeader title="Financieel overzicht" backHref="/admin" backLabel="Command Center" />

      {isLoading ? (
        <div className="admin-table-shell"><div className="admin-empty-state">Laden...</div></div>
      ) : (
        <>
          {/* Marge KPI's */}
          <div className="admin-stat-grid">
            <StatCard label="Omzet (betaald)" value={formatCurrency(totalRevenue)} numericValue={totalRevenue} compact />
            <StatCard label="Kosten (bonnen)" value={formatCurrency(totalExpenses)} numericValue={totalExpenses} compact />
            <StatCard
              label="Marge"
              value={formatCurrency(margin)}
              numericValue={margin}
              sub={`${marginPct}% marge`}
              compact
            />
            <StatCard label="Openstaand" value={formatCurrency((invoiceStats?.totalOpen ?? 0) + (invoiceStats?.totalOverdue ?? 0))} numericValue={(invoiceStats?.totalOpen ?? 0) + (invoiceStats?.totalOverdue ?? 0)} compact />
            <StatCard label="Totaal facturen" value={String(invoiceStats?.total ?? 0)} numericValue={invoiceStats?.total ?? 0} isCurrency={false} sub={`${invoiceStats?.paid ?? 0} betaald`} compact />
            <StatCard label="Totaal bonnen" value={String(expenses?.totalReceipts ?? 0)} numericValue={expenses?.totalReceipts ?? 0} isCurrency={false} compact />
          </div>

          <div className="admin-section-grid">
            {/* Kosten per categorie */}
            <div className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <p className="label">Uitgaven</p>
                  <h2 className="admin-panel-title">Kosten per categorie</h2>
                </div>
              </div>
              {(!expenses?.categoryCounts || expenses.categoryCounts.length === 0) ? (
                <div className="admin-empty-state">Geen kosten geregistreerd</div>
              ) : (
                <div className="admin-list">
                  {expenses.categoryCounts.map((cat) => {
                    const pct = totalExpenses > 0 ? Math.round((cat.total / totalExpenses) * 100) : 0;
                    return (
                      <div key={cat.category} className="admin-list-item" style={{ cursor: "default" }}>
                        <div className="admin-list-content">
                          <p className="admin-list-title">{cat.category}</p>
                          <p className="admin-list-sub">{cat.count} bonnen · {pct}% van totaal</p>
                          <div className="admin-plan-bar-track" style={{ marginTop: 4 }}>
                            <div className="admin-plan-bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="mono-amount" style={{ fontWeight: 500, whiteSpace: "nowrap" }}>
                          {formatCurrency(cat.total)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top gebruikers op kosten */}
            <div className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <p className="label">Gebruikers</p>
                  <h2 className="admin-panel-title">Kosten per gebruiker</h2>
                </div>
              </div>
              {(!expenses?.topUsers || expenses.topUsers.length === 0) ? (
                <div className="admin-empty-state">Geen gebruikers met kosten</div>
              ) : (
                <div className="admin-list">
                  {expenses.topUsers.map((user) => (
                    <Link key={user.user_id} href={`/admin/klanten/${user.user_id}`} className="admin-list-item">
                      <div className="admin-list-content">
                        <p className="admin-list-title">{user.user_name}</p>
                        <p className="admin-list-sub">{user.receipt_count} bonnen</p>
                      </div>
                      <span className="mono-amount" style={{ fontWeight: 500, whiteSpace: "nowrap" }}>
                        {formatCurrency(user.total_amount)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Marge visualisatie */}
          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <p className="label">Resultaat</p>
                <h2 className="admin-panel-title">Omzet vs Kosten</h2>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, padding: "0 16px 16px", alignItems: "flex-end", height: 120 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div
                  style={{
                    width: "100%",
                    maxWidth: 80,
                    height: `${totalRevenue > 0 ? 100 : 4}%`,
                    background: "var(--color-success, #1a7a3a)",
                    borderRadius: "4px 4px 0 0",
                    opacity: 0.7,
                  }}
                />
                <span className="label" style={{ fontSize: 9 }}>Omzet</span>
                <span className="mono-amount" style={{ fontSize: 11 }}>{formatCurrency(totalRevenue)}</span>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div
                  style={{
                    width: "100%",
                    maxWidth: 80,
                    height: `${totalRevenue > 0 ? Math.max((totalExpenses / totalRevenue) * 100, 4) : 4}%`,
                    background: "var(--color-accent, #a51c30)",
                    borderRadius: "4px 4px 0 0",
                    opacity: 0.7,
                  }}
                />
                <span className="label" style={{ fontSize: 9 }}>Kosten</span>
                <span className="mono-amount" style={{ fontSize: 11 }}>{formatCurrency(totalExpenses)}</span>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div
                  style={{
                    width: "100%",
                    maxWidth: 80,
                    height: `${totalRevenue > 0 ? Math.max((margin / totalRevenue) * 100, 4) : 4}%`,
                    background: margin >= 0 ? "var(--color-black, #000)" : "var(--color-accent, #a51c30)",
                    borderRadius: "4px 4px 0 0",
                    opacity: 0.8,
                  }}
                />
                <span className="label" style={{ fontSize: 9 }}>Marge</span>
                <span className="mono-amount" style={{ fontSize: 11, fontWeight: 600 }}>{formatCurrency(margin)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
