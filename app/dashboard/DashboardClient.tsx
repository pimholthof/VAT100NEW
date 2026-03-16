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
  Th,
  Td,
  ErrorMessage,
  ButtonSecondary,
} from "@/components/ui";
import { ActionFeed } from "@/components/dashboard/ActionFeed";
import { QuickReceiptUpload } from "@/components/dashboard/QuickReceiptUpload";

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
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: 16,
          marginBottom: 48,
          borderBottom: "0.5px solid rgba(13,13,11,0.15)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-sm)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-display)",
            textTransform: "uppercase",
          }}
        >
          Overzicht
        </span>
        <span className="label" style={{ opacity: 0.4 }}>
          {getCurrentMonth().toUpperCase()}
        </span>
      </div>

      {/* ── Hero Vrij Besteedbaar ── */}
      {isLoading ? (
        <div style={{ marginBottom: "var(--space-hero)" }}>
          <div className="skeleton" style={{ width: "40%", height: 9, marginBottom: 20, opacity: 0.08 }} />
          <div className="skeleton" style={{ width: "60%", height: 80, opacity: 0.06 }} />
        </div>
      ) : safeToSpend ? (
        <div
          style={{
            marginBottom: "var(--space-hero)",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 32,
            alignItems: "end",
          }}
        >
          <div>
            <p className="label" style={{ margin: "0 0 16px", opacity: 0.4 }}>
              Vrij besteedbaar
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
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              alignItems: "flex-end",
              borderLeft: "0.5px solid rgba(13,13,11,0.12)",
              paddingLeft: 32,
            }}
          >
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

      {/* ── Cashflow Chart ── */}
      {cashflow && <CashflowChart cashflow={cashflow} />}

      {/* ── BTW Deadline ── */}
      {vatDeadline && <VatDeadlineBanner deadline={vatDeadline} />}

      {/* ── Stat Strip ── */}
      <div className="editorial-divider" style={{ marginBottom: "var(--space-section)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            gap: 1,
            background: "rgba(13,13,11,0.06)",
            border: "0.5px solid rgba(13,13,11,0.08)",
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

      {/* ── Openstaande facturen ── */}
      <h2
        className="section-header"
        style={{
          margin: "0 0 16px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        Openstaande facturen
        <span
          style={{
            flex: 1,
            height: "0.5px",
            background: "rgba(13,13,11,0.15)",
          }}
        />
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

