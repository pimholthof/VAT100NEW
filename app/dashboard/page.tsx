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
      <h1
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "var(--text-display-lg)",
          fontWeight: 900,
          letterSpacing: "var(--tracking-display)",
          lineHeight: 0.9,
          margin: "0 0 64px",
        }}
      >
        Dashboard
      </h1>

      {/* Stat cards */}
      <div
        style={{
          borderTop: "0.5px solid rgba(13,13,11,0.15)",
          marginBottom: 72,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 24,
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
      </div>

      {/* BTW-deadline banner */}
      {vatDeadlineLoading ? (
        <div
          style={{
            borderTop: "0.5px solid rgba(13,13,11,0.15)",
            borderBottom: "0.5px solid rgba(13,13,11,0.15)",
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
            borderTop: "0.5px solid rgba(13,13,11,0.15)",
            borderBottom: "0.5px solid rgba(13,13,11,0.15)",
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
                fontSize: "var(--text-label)",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: "0 0 8px",
                opacity: 0.4,
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
                fontSize: "3rem",
                fontWeight: 900,
                lineHeight: 0.9,
                margin: 0,
              }}
            >
              {vatDeadline.daysRemaining} dagen
            </p>
            {vatDeadline.daysRemaining < 14 && (
              <p
                style={{
                  fontFamily: "var(--font-body), sans-serif",
                  fontSize: "var(--text-label)",
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  margin: "8px 0 0",
                  opacity: 0.4,
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
                fontSize: "var(--text-label)",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: "0 0 8px",
                opacity: 0.4,
              }}
            >
              GESCHAT BEDRAG
            </p>
            <p
              style={{
                fontFamily: "var(--font-display), sans-serif",
                fontSize: "3rem",
                fontWeight: 900,
                lineHeight: 0.9,
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
        <div style={{ marginBottom: 72 }}>
          <h2
            style={{
              fontFamily: "var(--font-display), sans-serif",
              fontSize: "var(--text-display-sm)",
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              lineHeight: 1,
              margin: "0 0 16px",
            }}
          >
            Cashflow
          </h2>

          <div
            style={{
              borderTop: "0.5px solid rgba(13,13,11,0.15)",
            }}
          >
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
          </div>

          <CashflowTable cashflow={cashflow} />
        </div>
      ) : null}

      {/* Upcoming due invoices */}
      <h2
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "var(--text-display-sm)",
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
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
            fontSize: "13px",
            fontWeight: 300,
            opacity: 0.3,
            marginBottom: 48,
            paddingTop: 48,
          }}
        >
          Geen openstaande facturen.
        </p>
      )}

      {/* Recent invoices table */}
      <h2
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "var(--text-display-sm)",
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          lineHeight: 1,
          margin: "72px 0 16px",
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
            fontSize: "13px",
            fontWeight: 300,
            opacity: 0.3,
            paddingTop: 48,
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
                <span
                  style={{
                    fontSize: "var(--text-label)",
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {statusLabels[inv.status] ?? inv.status}
                </span>
              </Td>
              <Td>{inv.client_name}</Td>
              <Td>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "var(--text-mono-md)" }}>
                  {formatDate(inv.issue_date)}
                </span>
              </Td>
              <Td style={{ textAlign: "right" }}>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "var(--text-mono-md)", fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrency(inv.total_inc_vat)}
                </span>
              </Td>
              <Td>
                <Link
                  href={`/dashboard/invoices/${inv.id}`}
                  style={{
                    fontFamily: "var(--font-body), sans-serif",
                    fontSize: "var(--text-label)",
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--foreground)",
                    textDecoration: "none",
                  }}
                >
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
    <div style={{ marginBottom: 48 }}>
      {statusMsg && <ErrorMessage>{statusMsg}</ErrorMessage>}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            borderSpacing: 0,
          }}
        >
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
                    <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "var(--text-mono-md)", fontVariantNumeric: "tabular-nums" }}>
                      {formatCurrency(inv.total_inc_vat)}
                    </span>
                  </Td>
                  <Td>
                    <span
                      style={{
                        fontSize: "var(--text-label)",
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
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
                      <span
                        style={{
                          fontSize: "var(--text-label)",
                          fontWeight: 500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          opacity: 0.3,
                        }}
                      >
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
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          borderSpacing: 0,
        }}
      >
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
                <Td style={{ textAlign: "left" }}>
                  {formatMonth(rev.month)}
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "var(--text-mono-md)", fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(rev.amount)}
                  </span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "var(--text-mono-md)", fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(expense)}
                  </span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "var(--text-mono-md)", fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(net)}
                  </span>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
