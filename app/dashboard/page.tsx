"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  getDashboardStats,
  getRecentInvoices,
  getUpcomingDueInvoices,
  getCashflowSummary,
  getVatDeadline,
  type RecentInvoice,
  type UpcomingInvoice,
  type CashflowSummary,
} from "@/lib/actions/dashboard";
import { sendReminder } from "@/lib/actions/invoices";
import {
  StatCard,
  SkeletonCard,
  SkeletonTable,
  buttonSecondaryStyle,
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

export default function DashboardPage() {
  const { data: statsResult, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => getDashboardStats(),
  });

  const { data: invoicesResult, isLoading: invoicesLoading } = useQuery({
    queryKey: ["dashboard-recent-invoices"],
    queryFn: () => getRecentInvoices(),
  });

  const { data: upcomingResult, isLoading: upcomingLoading } = useQuery({
    queryKey: ["dashboard-upcoming-invoices"],
    queryFn: () => getUpcomingDueInvoices(),
  });

  const { data: cashflowResult, isLoading: cashflowLoading } = useQuery({
    queryKey: ["dashboard-cashflow"],
    queryFn: () => getCashflowSummary(),
  });

  const { data: vatDeadlineResult, isLoading: vatDeadlineLoading } = useQuery({
    queryKey: ["dashboard-vat-deadline"],
    queryFn: () => getVatDeadline(),
  });

  const stats = statsResult?.data;
  const invoices = invoicesResult?.data;
  const upcomingInvoices = upcomingResult?.data;
  const cashflow = cashflowResult?.data;
  const vatDeadline = vatDeadlineResult?.data;

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "var(--text-display-lg)",
          fontWeight: 900,
          letterSpacing: "var(--tracking-display)",
          lineHeight: 1,
          margin: "0 0 48px",
        }}
      >
        Dashboard
      </h1>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 24,
          marginBottom: 48,
        }}
        className="stat-cards-grid"
      >
        {statsLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : stats ? (
          <>
            <StatCard
              label="Omzet deze maand"
              value={formatCurrency(stats.revenueThisMonth)}
            />
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

      {/* BTW-deadline banner */}
      {vatDeadlineLoading ? (
        <div
          style={{
            borderTop: "var(--border-rule)",
            borderBottom: "var(--border-rule)",
            padding: "24px 0",
            marginBottom: 48,
            opacity: 0.12,
          }}
        >
          <div className="skeleton" style={{ width: "40%", height: 32 }} />
        </div>
      ) : vatDeadline ? (
        <div
          className="vat-deadline-banner"
          style={{
            borderTop: "var(--border-rule)",
            borderBottom: "var(--border-rule)",
            padding: "24px 0",
            marginBottom: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.02em",
                margin: "0 0 8px",
                opacity: 0.6,
              }}
            >
              BTW-AANGIFTE {vatDeadline.quarter}
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
                fontSize: "2.5rem",
                fontWeight: 900,
                lineHeight: 1,
                margin: 0,
              }}
            >
              {vatDeadline.daysRemaining} dagen
            </p>
            {vatDeadline.daysRemaining < 14 && (
              <p
                style={{
                  fontFamily: "var(--font-body), sans-serif",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  margin: "8px 0 0",
                  opacity: 0.6,
                }}
              >
                Deadline nadert
              </p>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <p
              style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.02em",
                margin: "0 0 8px",
                opacity: 0.6,
              }}
            >
              GESCHAT BEDRAG
            </p>
            <p
              style={{
                fontFamily: "var(--font-display), sans-serif",
                fontSize: "2.5rem",
                fontWeight: 900,
                lineHeight: 1,
                margin: 0,
              }}
            >
              {formatCurrency(vatDeadline.estimatedAmount)}
            </p>
          </div>
        </div>
      ) : null}

      {/* Cashflow section */}
      {cashflowLoading ? (
        <div style={{ marginBottom: 48 }}>
          <div className="skeleton" style={{ width: "30%", height: 20, marginBottom: 16, opacity: 0.12 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24, opacity: 0.12 }}>
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ) : cashflow ? (
        <div style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: "var(--font-display), sans-serif",
              fontSize: "1.5rem",
              fontWeight: 900,
              letterSpacing: "var(--tracking-display)",
              lineHeight: 1,
              margin: "0 0 16px",
            }}
          >
            Cashflow
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 24,
              marginBottom: 24,
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

          <CashflowTable cashflow={cashflow} />
        </div>
      ) : null}

      {/* Upcoming due invoices */}
      <h2
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "1.5rem",
          fontWeight: 900,
          letterSpacing: "var(--tracking-display)",
          lineHeight: 1,
          margin: "0 0 16px",
        }}
      >
        Openstaande facturen
      </h2>

      {upcomingLoading ? (
        <SkeletonTable />
      ) : upcomingInvoices && upcomingInvoices.length > 0 ? (
        <UpcomingInvoiceTable invoices={upcomingInvoices} />
      ) : (
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-lg)",
            opacity: 0.5,
            marginBottom: 48,
          }}
        >
          Geen openstaande facturen.
        </p>
      )}

      {/* Recent invoices table */}
      <h2
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "1.5rem",
          fontWeight: 900,
          letterSpacing: "var(--tracking-display)",
          lineHeight: 1,
          margin: "0 0 16px",
        }}
      >
        Laatste facturen
      </h2>

      {invoicesLoading ? (
        <SkeletonTable />
      ) : invoices && invoices.length > 0 ? (
        <InvoiceTable invoices={invoices} />
      ) : (
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-lg)",
            opacity: 0.5,
          }}
        >
          Nog geen facturen aangemaakt.
        </p>
      )}
    </div>
  );
}

/* ── Invoice Table ── */

function InvoiceTable({ invoices }: { invoices: RecentInvoice[] }) {
  const cellStyle: React.CSSProperties = {
    padding: "10px 12px",
    fontFamily: "var(--font-body), sans-serif",
    fontSize: "var(--text-body-lg)",
    fontWeight: 400,
    letterSpacing: "0.05em",
    borderBottom: "1px solid rgba(13, 13, 11, 0.08)",
    textAlign: "left",
  };

  const headerStyle: React.CSSProperties = {
    ...cellStyle,
    fontSize: "10px",
    fontWeight: 500,
    letterSpacing: "0.02em",
    opacity: 0.5,
    borderBottom: "1px solid var(--foreground)",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          borderSpacing: 0,
        }}
      >
        <thead>
          <tr>
            <th style={headerStyle}>Status</th>
            <th style={headerStyle}>Klant</th>
            <th style={headerStyle}>Datum</th>
            <th style={{ ...headerStyle, textAlign: "right" }}>Bedrag</th>
            <th style={{ ...headerStyle, width: 80 }}>Actie</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td style={cellStyle}>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                  }}
                >
                  {statusLabels[inv.status] ?? inv.status}
                </span>
              </td>
              <td style={cellStyle}>{inv.client_name}</td>
              <td style={cellStyle}>{formatDate(inv.issue_date)}</td>
              <td style={{ ...cellStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {formatCurrency(inv.total_inc_vat)}
              </td>
              <td style={cellStyle}>
                <Link
                  href={`/dashboard/invoices/${inv.id}`}
                  style={{
                    fontFamily: "var(--font-body), sans-serif",
                    fontSize: "var(--text-body-sm)",
                    fontWeight: 500,
                    letterSpacing: "0.05em",
                    color: "var(--foreground)",
                    textDecoration: "underline",
                  }}
                >
                  Bekijk
                </Link>
              </td>
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

  const cellStyle: React.CSSProperties = {
    padding: "10px 12px",
    fontFamily: "var(--font-body), sans-serif",
    fontSize: "var(--text-body-lg)",
    fontWeight: 400,
    letterSpacing: "0.05em",
    borderBottom: "1px solid rgba(13, 13, 11, 0.08)",
    textAlign: "left",
  };

  const headerStyle: React.CSSProperties = {
    ...cellStyle,
    fontSize: "10px",
    fontWeight: 500,
    letterSpacing: "0.02em",
    opacity: 0.5,
    borderBottom: "1px solid var(--foreground)",
  };

  return (
    <div style={{ marginBottom: 48 }}>
      {statusMsg && (
        <div
          style={{
            padding: "12px 16px",
            borderLeft: "2px solid var(--foreground)",
            marginBottom: 16,
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-md)",
            fontWeight: 400,
          }}
        >
          {statusMsg}
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            borderSpacing: 0,
          }}
        >
          <thead>
            <tr>
              <th style={headerStyle}>Klant</th>
              <th style={headerStyle}>Factuurnr</th>
              <th style={{ ...headerStyle, textAlign: "right" }}>Bedrag</th>
              <th style={headerStyle}>Status</th>
              <th style={{ ...headerStyle, width: 160 }}>Actie</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const isOverdue = inv.days_overdue > 0;
              return (
                <tr key={inv.id}>
                  <td
                    style={{
                      ...cellStyle,
                      borderLeft: isOverdue
                        ? "2px solid var(--foreground)"
                        : "2px solid transparent",
                    }}
                  >
                    {inv.client_name}
                  </td>
                  <td style={cellStyle}>
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      style={{
                        fontFamily: "var(--font-body), sans-serif",
                        fontSize: "var(--text-body-lg)",
                        fontWeight: 400,
                        color: "var(--foreground)",
                        textDecoration: "underline",
                      }}
                    >
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td
                    style={{
                      ...cellStyle,
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatCurrency(inv.total_inc_vat)}
                  </td>
                  <td style={cellStyle}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 500,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {isOverdue
                        ? `${inv.days_overdue}d verlopen`
                        : inv.days_overdue === 0
                          ? "Vandaag"
                          : `${Math.abs(inv.days_overdue)}d`}
                    </span>
                  </td>
                  <td style={cellStyle}>
                    {inv.client_email ? (
                      <button
                        type="button"
                        onClick={() => handleSendReminder(inv.id)}
                        disabled={sendingId === inv.id}
                        style={buttonSecondaryStyle}
                      >
                        {sendingId === inv.id
                          ? "Verzenden..."
                          : "Stuur herinnering"}
                      </button>
                    ) : (
                      <span
                        style={{
                          fontSize: "var(--text-body-sm)",
                          opacity: 0.4,
                        }}
                      >
                        Geen e-mail
                      </span>
                    )}
                  </td>
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
  const cellStyle: React.CSSProperties = {
    padding: "10px 12px",
    fontFamily: "var(--font-body), sans-serif",
    fontSize: "var(--text-body-lg)",
    fontWeight: 400,
    letterSpacing: "0.05em",
    borderBottom: "1px solid rgba(13, 13, 11, 0.08)",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  };

  const headerStyle: React.CSSProperties = {
    padding: "10px 12px",
    fontFamily: "var(--font-body), sans-serif",
    fontSize: "10px",
    fontWeight: 500,
    letterSpacing: "0.02em",
    opacity: 0.5,
    borderBottom: "1px solid var(--foreground)",
    textAlign: "right",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          borderSpacing: 0,
        }}
      >
        <thead>
          <tr>
            <th style={{ ...headerStyle, textAlign: "left" }}>Maand</th>
            <th style={headerStyle}>Omzet</th>
            <th style={headerStyle}>Kosten</th>
            <th style={headerStyle}>Netto</th>
          </tr>
        </thead>
        <tbody>
          {cashflow.monthlyRevenue.map((rev, i) => {
            const expense = cashflow.monthlyExpenses[i]?.amount ?? 0;
            const net = Math.round((rev.amount - expense) * 100) / 100;
            return (
              <tr key={rev.month}>
                <td style={{ ...cellStyle, textAlign: "left" }}>
                  {formatMonth(rev.month)}
                </td>
                <td style={cellStyle}>{formatCurrency(rev.amount)}</td>
                <td style={cellStyle}>{formatCurrency(expense)}</td>
                <td style={cellStyle}>{formatCurrency(net)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

