"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getPlatformInvoices, getPlatformExpenses, getSubscriptionPayments } from "@/features/admin/actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { AdminStatePanel } from "../AdminStatePanel";

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(dateStr));
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "Betaald",
  pending: "In afwachting",
  failed: "Mislukt",
  open: "Open",
  expired: "Verlopen",
  canceled: "Geannuleerd",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
}

export default function AdminFinancialsPage() {
  const [subPage, setSubPage] = useState(1);

  const { data: invoiceResult, isLoading: loadingInvoices } = useQuery({
    queryKey: ["admin-financials-invoices"],
    queryFn: () => getPlatformInvoices({ pageSize: 1 }),
  });

  const { data: expenseResult, isLoading: loadingExpenses } = useQuery({
    queryKey: ["admin-financials-expenses"],
    queryFn: getPlatformExpenses,
  });

  const { data: subPayResult, isLoading: loadingSubPay } = useQuery({
    queryKey: ["admin-subscription-payments", subPage],
    queryFn: () => getSubscriptionPayments({ page: subPage, pageSize: 15 }),
  });

  const isLoading = loadingInvoices || loadingExpenses;
  const invoiceStats = invoiceResult?.data?.stats;
  const expenses = expenseResult?.data;
  const subPayments = subPayResult?.data?.payments ?? [];
  const subPayStats = subPayResult?.data?.stats;
  const subPayTotal = subPayResult?.data?.total ?? 0;
  const subPayTotalPages = Math.ceil(subPayTotal / 15);

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
                    <Link key={user.user_id} href={`/admin/users/${user.user_id}`} className="admin-list-item">
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

          {/* ─── Abonnementsfacturen ─── */}
          <div className="admin-panel admin-section">
            <div className="admin-panel-header">
              <div>
                <p className="label">Abonnementen</p>
                <h2 className="admin-panel-title">Abonnementsfacturen</h2>
                <p className="admin-panel-description">
                  Alle betalingen van klanten voor hun VAT100-abonnement
                </p>
              </div>
            </div>

            {/* Sub KPI's */}
            {subPayStats && (
              <div className="admin-stat-grid" style={{ padding: "0 16px 16px" }}>
                <StatCard
                  label="Totaal ontvangen"
                  value={formatCurrency(subPayStats.totalRevenueCents / 100)}
                  numericValue={subPayStats.totalRevenueCents / 100}
                  sub={`${subPayStats.totalPaid} betalingen`}
                  compact
                />
                <StatCard
                  label="Deze maand"
                  value={formatCurrency(subPayStats.recentMonthRevenueCents / 100)}
                  numericValue={subPayStats.recentMonthRevenueCents / 100}
                  sub="Abonnementsinkomsten"
                  compact
                />
                <StatCard
                  label="Gem. betaling"
                  value={formatCurrency(subPayStats.avgPaymentCents / 100)}
                  numericValue={subPayStats.avgPaymentCents / 100}
                  sub="Per transactie"
                  compact
                />
              </div>
            )}

            {/* Tabel */}
            {loadingSubPay ? (
              <div className="admin-empty-state">Laden...</div>
            ) : subPayments.length === 0 ? (
              <div className="admin-empty-state">Nog geen abonnementsbetalingen ontvangen</div>
            ) : (
              <>
                <div className="admin-summary-row" style={{ padding: "0 16px" }}>
                  <p className="label">{subPayTotal} betaling{subPayTotal !== 1 ? "en" : ""}</p>
                  <p className="label">Pagina {subPage}{subPayTotalPages > 0 ? ` van ${subPayTotalPages}` : ""}</p>
                </div>
                <div className="admin-table-shell" style={{ margin: "0 16px 16px" }}>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          {["Factuurnr.", "Klant", "Plan", "Bedrag", "Status", "Ontvangstbewijs", "Betaald op"].map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {subPayments.map((payment) => (
                          <tr key={payment.id}>
                            <td className="mono-amount">
                              {payment.invoice_number ?? "—"}
                            </td>
                            <td>
                              <Link href={`/admin/users/${payment.user_id}`} className="admin-primary-link">
                                {payment.user_name}
                              </Link>
                              {payment.user_email && (
                                <span className="label" style={{ display: "block", opacity: 0.4, fontSize: 10 }}>
                                  {payment.user_email}
                                </span>
                              )}
                            </td>
                            <td>
                              <span className="admin-badge admin-badge-neutral">{payment.plan_name}</span>
                            </td>
                            <td className="mono-amount admin-right">
                              {formatCurrency(payment.amount_cents / 100)}
                            </td>
                            <td>
                              <span className={`admin-badge ${payment.status === "paid" ? "admin-badge-success" : payment.status === "failed" ? "admin-badge-critical" : "admin-badge-warning"}`}>
                                {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                              </span>
                            </td>
                            <td>
                              {payment.receipt_sent_at ? (
                                <span className="admin-badge admin-badge-success">Verstuurd</span>
                              ) : payment.status === "paid" ? (
                                <span className="admin-badge admin-badge-warning">Niet verstuurd</span>
                              ) : (
                                <span style={{ opacity: 0.3 }}>—</span>
                              )}
                            </td>
                            <td className="label">
                              {payment.paid_at ? formatDate(payment.paid_at) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {subPayTotalPages > 1 && (
                  <div className="admin-pagination" style={{ padding: "0 16px 16px" }}>
                    <button onClick={() => setSubPage((p) => Math.max(1, p - 1))} disabled={subPage === 1} className="admin-page-button">Vorige</button>
                    <span className="admin-page-button label">{subPage} / {subPayTotalPages}</span>
                    <button onClick={() => setSubPage((p) => Math.min(subPayTotalPages, p + 1))} disabled={subPage === subPayTotalPages} className="admin-page-button">Volgende</button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
