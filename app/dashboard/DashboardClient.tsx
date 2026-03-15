"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  getDashboardData,
  type RecentInvoice,
  type UpcomingInvoice,
  type CashflowSummary,
  type DashboardData,
} from "@/lib/actions/dashboard";
import type { ActionResult } from "@/lib/types";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/constants/status";
import { ActionFeed } from "@/components/dashboard/ActionFeed";
import { QuickReceiptUpload } from "@/components/dashboard/QuickReceiptUpload";
import { FinancialInsights } from "@/components/dashboard/FinancialInsights";
import { CashflowChart } from "@/components/dashboard/CashflowChart";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { SetupChecklist } from "@/components/dashboard/SetupChecklist";
import { VatDeadlineBanner } from "@/components/dashboard/VatDeadlineBanner";

function getCurrentMonth(): string {
  return new Date().toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
}

export default function DashboardClient({
  initialResult,
}: {
  initialResult?: ActionResult<DashboardData>;
}) {
  const { data: dashboardResult, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
    initialData: initialResult,
  });

  const data = dashboardResult?.data;
  const stats = data?.stats;
  const invoices = data?.recentInvoices;
  const upcomingInvoices = data?.upcomingInvoices;
  const cashflow = data?.cashflow;
  const vatDeadline = data?.vatDeadline;
  const safeToSpend = data?.safeToSpend;

  return (
    <div>
      {/* ── Smart Onboarding ── */}
      <SetupChecklist />

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
        <span className="label" style={{ opacity: 0.5 }}>
          Overzicht
        </span>
        <span className="label" style={{ opacity: 0.4 }}>
          {getCurrentMonth().toUpperCase()}
        </span>
      </div>

      {/* ── Hero Safe-to-Spend ── */}
      {isLoading ? (
        <div style={{ marginBottom: "var(--space-hero)" }}>
          <div className="skeleton" style={{ width: "40%", height: 9, marginBottom: 20, opacity: 0.08 }} />
          <div className="skeleton" style={{ width: "60%", height: 80, opacity: 0.06 }} />
        </div>
      ) : safeToSpend ? (
        <div style={{ marginBottom: "var(--space-hero)" }}>
          <p className="label" style={{ margin: "0 0 16px", opacity: 0.6 }}>
            Safe-to-Spend
          </p>
            <AnimatedNumber
              value={safeToSpend.safeToSpend}
              style={{
                fontFamily: "var(--font-display), sans-serif",
                fontSize: "var(--text-display-xl)",
                fontWeight: 700,
                lineHeight: 0.85,
                letterSpacing: "var(--tracking-display)",
              }}
            />
          <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
            <span className="label" style={{ opacity: 0.4, textTransform: "none", letterSpacing: "normal" }}>
              Saldo: {formatCurrency(safeToSpend.currentBalance)}
            </span>
            <span className="label" style={{ opacity: 0.4, textTransform: "none", letterSpacing: "normal" }}>
              BTW reserve: {formatCurrency(safeToSpend.estimatedVat)}
            </span>
            <span className="label" style={{ opacity: 0.4, textTransform: "none", letterSpacing: "normal" }}>
              IB reserve: {formatCurrency(safeToSpend.estimatedIncomeTax)}
            </span>
          </div>
        </div>
      ) : null}

      {/* ── Quick Receipt Upload ── */}
      {!isLoading && <QuickReceiptUpload />}

      {/* ── Action Feed (Inbox Zero) ── */}
      {!isLoading && <ActionFeed />}

      {/* ── Financial Intelligence Panel ── */}
      {cashflow && safeToSpend && (
        <FinancialInsights cashflow={cashflow} safeToSpend={safeToSpend} />
      )}

      {/* ── Cashflow Chart ── */}
      {cashflow && <CashflowChart cashflow={cashflow} />}

      {/* ── BTW Deadline ── */}
      {vatDeadline && <VatDeadlineBanner deadline={vatDeadline} />}

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
          {isLoading ? (
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
      {isLoading ? (
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
            <p className="label" style={{ margin: "0 0 10px", opacity: 0.6 }}>
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
                fontWeight: 700,
                lineHeight: 0.9,
                margin: 0,
              }}
            >
              {vatDeadline.daysRemaining}
            </p>
            <p className="label" style={{ margin: "10px 0 0", opacity: 0.5 }}>
              {vatDeadline.daysRemaining < 14 ? "Dagen — deadline nadert" : "Dagen"}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p className="label" style={{ margin: "0 0 10px", opacity: 0.6 }}>
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
      {isLoading ? (
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

      {isLoading ? (
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

      {isLoading ? (
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
                  {STATUS_LABELS[inv.status] ?? inv.status}
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
