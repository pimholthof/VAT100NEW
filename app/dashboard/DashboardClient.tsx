"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  getDashboardData,
  type UpcomingInvoice,
  type DashboardData,
} from "@/lib/actions/dashboard";
import type { ActionResult } from "@/lib/types";
import { sendReminder } from "@/lib/actions/invoices";
import { formatCurrency } from "@/lib/format";

import {
  StatCard,
  SkeletonCard,
  SkeletonTable,
  ErrorMessage,
} from "@/components/ui";
import { ActionFeed } from "@/components/dashboard/ActionFeed";
import { FiscalPulse } from "@/components/dashboard/FiscalPulse";
import { QuickReceiptUpload } from "@/components/dashboard/QuickReceiptUpload";
import { CashflowChart } from "@/components/dashboard/CashflowChart";

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
  const upcomingInvoices = data?.upcomingInvoices;
  const cashflow = data?.cashflow;
  const safeToSpend = data?.safeToSpend;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-section)",
      paddingBottom: "var(--space-hero)",
    }}>
      {/* ── Fiscal Pulse Hero ── */}
      {safeToSpend && !isLoading && (
        <FiscalPulse
          safeToSpend={safeToSpend.safeToSpend}
          currentBalance={safeToSpend.currentBalance}
          isLoading={isLoading}
        />
      )}

      {/* ── Editorial Grid: 4 + 8 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">

        {/* ── LEFT: Operational (Span 4) ── */}
        <div className="lg:col-span-4 flex flex-col gap-16">

          {/* Stat Cards */}
          {!isLoading && stats ? (
            <>
              <StatCard
                label="Openstaand"
                value={String(stats.openInvoiceCount)}
                numericValue={stats.openInvoiceCount}
                sub={formatCurrency(stats.openInvoiceAmount)}
              />
              <div style={{ borderTop: "var(--border-rule)" }} />
              <StatCard
                label="BTW-Reserve"
                value={formatCurrency(stats.vatToPay)}
                numericValue={stats.vatToPay}
                sub="Q-Prognose"
              />
            </>
          ) : (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          <div style={{ borderTop: "var(--border-rule)" }} />

          {/* Quick Receipt Upload */}
          {!isLoading && <QuickReceiptUpload />}

          <div style={{ borderTop: "var(--border-rule)" }} />

          {/* Action Feed */}
          {!isLoading && <ActionFeed />}
        </div>

        {/* ── RIGHT: Strategic Canvas (Span 8) ── */}
        <div className="lg:col-span-8 flex flex-col gap-16">

          {/* Cashflow Chart */}
          {cashflow && (
            <div style={{
              padding: "var(--space-block)",
              border: "var(--border-light)",
            }}>
              <p className="label" style={{ marginBottom: "var(--space-block)" }}>
                Liquiditeit / Prognose
              </p>
              <CashflowChart cashflow={cashflow} />
            </div>
          )}

          {/* Upcoming Invoices */}
          <div>
            <h2 className="section-header" style={{
              marginBottom: "var(--space-block)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-element)",
              opacity: 0.5,
            }}>
              Dossier / Openstaand
              <span style={{ flex: 1, height: "0.5px", background: "rgba(13, 13, 11, 0.06)" }} />
            </h2>
            {isLoading ? (
              <SkeletonTable />
            ) : upcomingInvoices && upcomingInvoices.length > 0 ? (
              <UpcomingInvoiceList invoices={upcomingInvoices} />
            ) : (
              <p className="empty-state">Geen actieve componenten</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Upcoming Invoice List ── */

function UpcomingInvoiceList({ invoices }: { invoices: UpcomingInvoice[] }) {
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSendReminder = async (invoiceId: string) => {
    setSendingId(invoiceId);
    setStatusMsg(null);
    const res = await sendReminder(invoiceId);
    if (res.error) {
      setStatusMsg(res.error);
    } else {
      setStatusMsg("Herinnering verzonden.");
    }
    setSendingId(null);
  };

  return (
    <div>
      {statusMsg && <ErrorMessage>{statusMsg}</ErrorMessage>}

      <div style={{ display: "flex", flexDirection: "column" }}>
        {invoices.map((inv) => {
          const isOverdue = inv.days_overdue > 0;

          return (
            <div
              key={inv.id}
              style={{
                padding: "20px 0",
                borderBottom: "0.5px solid rgba(13, 13, 11, 0.06)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: "var(--space-element)",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "baseline", marginBottom: 8 }}>
                  <span className="label-strong" style={{ fontSize: 9, letterSpacing: "0.1em" }}>
                    {inv.invoice_number}
                  </span>
                  <span className="label" style={{
                    opacity: isOverdue ? 0.8 : 0.3,
                  }}>
                    {isOverdue ? `${inv.days_overdue}D ACHTERSTALLIG` : "ACTIEF"}
                  </span>
                </div>
                <Link
                  href={`/dashboard/invoices/${inv.id}`}
                  style={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontSize: "var(--text-display-md)",
                    fontWeight: 700,
                    letterSpacing: "var(--tracking-display)",
                    textDecoration: "none",
                    color: "var(--foreground)",
                    lineHeight: 1,
                  }}
                >
                  {inv.client_name.toUpperCase()}
                </Link>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-element)" }}>
                <span className="mono-amount" style={{ fontWeight: 400 }}>
                  {formatCurrency(inv.total_inc_vat)}
                </span>

                {inv.client_email ? (
                  <button
                    onClick={() => handleSendReminder(inv.id)}
                    disabled={sendingId === inv.id}
                    className="label-strong"
                    style={{
                      background: "transparent",
                      border: "none",
                      borderBottom: "0.5px solid var(--foreground)",
                      cursor: "pointer",
                      padding: "0 0 2px 0",
                      opacity: sendingId === inv.id ? 0.2 : 0.6,
                      color: "var(--foreground)",
                    }}
                  >
                    {sendingId === inv.id ? "..." : "HERINNERING"}
                  </button>
                ) : (
                  <span className="label" style={{ opacity: 0.2 }}>
                    GEEN E-MAIL
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
