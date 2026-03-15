"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  getDashboardData,
  type RecentInvoice,
  type UpcomingInvoice,
  type CashflowSummary,
} from "@/lib/actions/dashboard";
import { sendReminder } from "@/lib/actions/invoices";
import {
  StatCard,
  SkeletonCard,
  SkeletonTable,
  Th,
  Td,
  ErrorMessage,
  ButtonSecondary,
} from "@/components/ui";

const statusLabels: Record<string, string> = {
  draft: "Concept",
  sent: "Verzonden",
  paid: "Betaald",
  overdue: "Verlopen",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getCurrentMonth(): string {
  return new Date().toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
}

export default function DashboardPage() {
  const { data: dashboardResult, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
  });

  const stats = dashboardResult?.data?.stats;
  const invoices = dashboardResult?.data?.recentInvoices;
  const upcomingInvoices = dashboardResult?.data?.upcomingInvoices;
  const cashflow = dashboardResult?.data?.cashflow;
  const vatDeadline = dashboardResult?.data?.vatDeadline;

  const statsLoading = isLoading;
  const invoicesLoading = isLoading;
  const upcomingLoading = isLoading;
  const cashflowLoading = isLoading;
  const vatDeadlineLoading = isLoading;

  return (
    <div>
      {/* ── Masthead ── */}
      <div
        className="editorial-divider"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: 16,
          marginBottom: 48,
        }}
      >
        <span className="label" style={{ opacity: 0.3 }}>
          Overzicht
        </span>
        <span className="label" style={{ opacity: 0.2 }}>
          {getCurrentMonth().toUpperCase()}
        </span>
      </div>

      {/* ── Hero Revenue ── */}
      {statsLoading ? (
        <div style={{ marginBottom: "var(--space-hero)" }}>
          <div className="skeleton" style={{ width: "40%", height: 9, marginBottom: 20, opacity: 0.08 }} />
          <div className="skeleton" style={{ width: "60%", height: 80, opacity: 0.06 }} />
        </div>
      ) : stats ? (
        <div style={{ marginBottom: "var(--space-hero)" }}>
          <p className="label" style={{ margin: "0 0 16px", opacity: 0.3 }}>
            Omzet {getCurrentMonth()}
          </p>
          <p
            style={{
              fontFamily: "var(--font-display), sans-serif",
              fontSize: "var(--text-display-xl)",
              fontWeight: 900,
              lineHeight: 0.85,
              letterSpacing: "var(--tracking-display)",
              margin: 0,
            }}
          >
            {formatCurrency(stats.revenueThisMonth)}
          </p>
        </div>
      ) : null}

      {/* ── Stat Strip ── */}
      <div className="editorial-divider" style={{ marginBottom: "var(--space-section)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--space-element)",
          }}
          className="stat-cards-grid"
        >
          {statsLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : stats ? (
            <>
              <StatCard
                label="Open facturen"
                value={String(stats.openInvoiceCount)}
                sub={formatCurrency(stats.openInvoiceAmount)}
              />
              <StatCard
                label="BTW te betalen"
                value={formatCurrency(stats.vatToPay)}
              />
              <StatCard
                label="Bonnen deze maand"
                value={String(stats.receiptsThisMonth)}
              />
            </>
          ) : null}
        </div>
      </div>

      {/* ── BTW-deadline banner ── */}
      {vatDeadlineLoading ? (
        <div
          className="editorial-divider"
          style={{
            borderBottom: "0.5px solid rgba(13,13,11,0.15)",
            padding: "32px 0",
            marginBottom: "var(--space-section)",
            opacity: 0.12,
          }}
        >
          <div className="skeleton" style={{ width: "40%", height: 40 }} />
        </div>
      ) : vatDeadline ? (
        <div
          className="vat-deadline-banner editorial-divider"
          style={{
            borderBottom: "0.5px solid rgba(13,13,11,0.15)",
            padding: "32px 0",
            marginBottom: "var(--space-section)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-element)",
          }}
        >
          <div>
            <p className="label" style={{ margin: "0 0 10px", opacity: 0.3 }}>
              BTW-aangifte {vatDeadline.quarter}
            </p>
            <p
              style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "var(--text-body-lg)",
                fontWeight: 400,
                margin: 0,
              }}
            >
              Deadline: {vatDeadline.deadline}
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontFamily: "var(--font-display), sans-serif",
                fontSize: "var(--text-display-lg)",
                fontWeight: 900,
                lineHeight: 0.9,
                margin: 0,
              }}
            >
              {vatDeadline.daysRemaining}
            </p>
            <p className="label" style={{ margin: "10px 0 0", opacity: 0.3 }}>
              {vatDeadline.daysRemaining < 14 ? "Dagen — deadline nadert" : "Dagen"}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p className="label" style={{ margin: "0 0 10px", opacity: 0.3 }}>
              Geschat bedrag
            </p>
            <p
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "var(--text-mono-lg)",
                fontWeight: 300,
                lineHeight: 1,
                margin: 0,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatCurrency(vatDeadline.estimatedAmount)}
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Cashflow ── */}
      {cashflowLoading ? (
        <div style={{ marginBottom: "var(--space-section)" }}>
          <div className="skeleton" style={{ width: "30%", height: 14, marginBottom: 24, opacity: 0.08 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--space-element)", opacity: 0.08 }}>
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ) : cashflow ? (
        <div style={{ marginBottom: "var(--space-section)" }}>
          <h2 className="section-header" style={{ margin: "0 0 16px" }}>
            Cashflow
          </h2>

          <div className="editorial-divider">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "var(--space-element)",
                marginBottom: "var(--space-element)",
              }}
            >
              <StatCard
                label="Netto resultaat deze maand"
                value={`${cashflow.trend === "up" ? "↑ " : cashflow.trend === "down" ? "↓ " : ""}${formatCurrency(cashflow.netThisMonth)}`}
              />
              <StatCard
                label="Netto resultaat vorige maand"
                value={formatCurrency(cashflow.netLastMonth)}
              />
            </div>
          </div>

          <CashflowTable cashflow={cashflow} />
        </div>
      ) : null}

      {/* ── Upcoming due invoices ── */}
      <h2 className="section-header" style={{ margin: "0 0 16px" }}>
        Openstaande facturen
      </h2>

      {upcomingLoading ? (
        <SkeletonTable />
      ) : upcomingInvoices && upcomingInvoices.length > 0 ? (
        <UpcomingInvoiceTable invoices={upcomingInvoices} />
      ) : (
        <p className="empty-state">
          Geen openstaande facturen
        </p>
      )}

      {/* ── Recent invoices ── */}
      <h2
        className="section-header"
        style={{ margin: "var(--space-section) 0 16px" }}
      >
        Laatste facturen
      </h2>

      {invoicesLoading ? (
        <SkeletonTable />
      ) : invoices && invoices.length > 0 ? (
        <InvoiceTable invoices={invoices} />
      ) : (
        <p className="empty-state">
          Nog geen facturen aangemaakt
        </p>
      )}
    </div>
  );
}

/* ── Invoice Table ── */

function InvoiceTable({ invoices }: { invoices: RecentInvoice[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", borderSpacing: 0 }}>
        <thead>
          <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)" }}>
            <Th>Status</Th>
            <Th>Klant</Th>
            <Th>Datum</Th>
            <Th style={{ textAlign: "right" }}>Bedrag</Th>
            <Th style={{ width: 80 }}>Actie</Th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} style={{ borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
              <Td>
                <span className="label" style={{ opacity: 1 }}>
                  {statusLabels[inv.status] ?? inv.status}
                </span>
              </Td>
              <Td style={{ fontWeight: 400 }}>{inv.client_name}</Td>
              <Td>
                <span className="mono-amount">
                  {formatDate(inv.issue_date)}
                </span>
              </Td>
              <Td style={{ textAlign: "right" }}>
                <span className="mono-amount">
                  {formatCurrency(inv.total_inc_vat)}
                </span>
              </Td>
              <Td>
                <Link href={`/dashboard/invoices/${inv.id}`} className="table-action">
                  Bekijk
                </Link>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Upcoming Invoice Table ── */

function UpcomingInvoiceTable({ invoices }: { invoices: UpcomingInvoice[] }) {
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSendReminder = async (invoiceId: string) => {
    setSendingId(invoiceId);
    setStatusMsg(null);
    const res = await sendReminder(invoiceId);
    if (res.error) {
      setStatusMsg(res.error);
    } else {
      setStatusMsg("Herinnering verstuurd.");
    }
    setSendingId(null);
  };

  return (
    <div style={{ marginBottom: "var(--space-block)" }}>
      {statusMsg && <ErrorMessage>{statusMsg}</ErrorMessage>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", borderSpacing: 0 }}>
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)" }}>
              <Th>Klant</Th>
              <Th>Factuurnr</Th>
              <Th style={{ textAlign: "right" }}>Bedrag</Th>
              <Th>Status</Th>
              <Th style={{ width: 160 }}>Actie</Th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const isOverdue = inv.days_overdue > 0;
              return (
                <tr key={inv.id} style={{ borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
                  <Td
                    style={{
                      borderLeft: isOverdue
                        ? "2px solid var(--foreground)"
                        : "2px solid transparent",
                      fontWeight: 400,
                    }}
                  >
                    {inv.client_name}
                  </Td>
                  <Td>
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      style={{
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: "var(--text-mono-md)",
                        fontWeight: 400,
                        color: "var(--foreground)",
                        textDecoration: "none",
                      }}
                    >
                      {inv.invoice_number}
                    </Link>
                  </Td>
                  <Td style={{ textAlign: "right" }}>
                    <span className="mono-amount">
                      {formatCurrency(inv.total_inc_vat)}
                    </span>
                  </Td>
                  <Td>
                    <span className="label" style={{ opacity: 1 }}>
                      {isOverdue
                        ? `${inv.days_overdue}d verlopen`
                        : inv.days_overdue === 0
                          ? "Vandaag"
                          : `${Math.abs(inv.days_overdue)}d`}
                    </span>
                  </Td>
                  <Td>
                    {inv.client_email ? (
                      <ButtonSecondary
                        onClick={() => handleSendReminder(inv.id)}
                        disabled={sendingId === inv.id}
                      >
                        {sendingId === inv.id
                          ? "Verzenden..."
                          : "Stuur herinnering"}
                      </ButtonSecondary>
                    ) : (
                      <span className="label" style={{ opacity: 0.3 }}>
                        Geen e-mail
                      </span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Cashflow Table ── */

function formatMonth(key: string): string {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("nl-NL", { month: "short", year: "numeric" });
}

function CashflowTable({ cashflow }: { cashflow: CashflowSummary }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", borderSpacing: 0 }}>
        <thead>
          <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)" }}>
            <Th style={{ textAlign: "left" }}>Maand</Th>
            <Th style={{ textAlign: "right" }}>Omzet</Th>
            <Th style={{ textAlign: "right" }}>Kosten</Th>
            <Th style={{ textAlign: "right" }}>Netto</Th>
          </tr>
        </thead>
        <tbody>
          {cashflow.monthlyRevenue.map((rev, i) => {
            const expense = cashflow.monthlyExpenses[i]?.amount ?? 0;
            const net = Math.round((rev.amount - expense) * 100) / 100;
            return (
              <tr key={rev.month} style={{ borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
                <Td style={{ textAlign: "left", fontWeight: 400 }}>
                  {formatMonth(rev.month)}
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span className="mono-amount">{formatCurrency(rev.amount)}</span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span className="mono-amount">{formatCurrency(expense)}</span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span className="mono-amount">{formatCurrency(net)}</span>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
