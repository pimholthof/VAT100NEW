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
  SkeletonTable,
  ErrorMessage,
} from "@/components/ui";
import { QuickReceiptUpload } from "@/components/dashboard/QuickReceiptUpload";

export default function DashboardClient({
  initialResult,
}: {
  initialResult?: ActionResult<DashboardData>;
}) {
  const { data: dashboardResult, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
    initialData: initialResult,
    staleTime: 5 * 60 * 1000,
  });

  const data = dashboardResult?.data;
  const stats = data?.stats;
  const upcomingInvoices = data?.upcomingInvoices;
  const safeToSpend = data?.safeToSpend;

  return (
    <div
      className="dashboard-content"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 32,
        paddingBottom: 80,
      }}
    >
      {/* ── 1. HERO: Safe to Spend ── */}
      {safeToSpend && !isLoading && (
        <div style={{ padding: "48px 0", borderBottom: "var(--border-light)" }}>
          <p className="label" style={{ marginBottom: 16 }}>Vrij te besteden</p>
          <p className="mono-amount-lg" style={{ fontSize: "clamp(3rem, 8vw, 6rem)" }}>
            {formatCurrency(safeToSpend.safeToSpend)}
          </p>
        </div>
      )}

      {/* ── 2. METRICS ROW ── */}
      {!isLoading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Openstaand"
            value={String(stats.openInvoiceCount)}
            sub={formatCurrency(stats.openInvoiceAmount)}
          />
          <StatCard
            label="BTW-Reserve"
            value={formatCurrency(stats.vatToPay)}
            sub="Q-Prognose"
          />
          <QuickReceiptUpload />
        </div>
      )}

      {/* ── 3. DOSSIER / OPENSTAAND ── */}
      <div>
        <h2
          className="section-header"
          style={{
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: 0.5,
          }}
        >
          Dossier / Openstaand
          <span style={{ flex: 1, height: "0.5px", background: "rgba(10,10,10,0.06)" }} />
        </h2>
        {isLoading ? (
          <SkeletonTable />
        ) : upcomingInvoices && upcomingInvoices.length > 0 ? (
          <UpcomingInvoiceTable invoices={upcomingInvoices} />
        ) : (
          <p className="empty-state">Geen openstaande facturen</p>
        )}
      </div>
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
      setStatusMsg("Herinnering verzonden.");
    }
    setSendingId(null);
  };

  return (
    <div style={{ border: "var(--border-light)" }}>
      {statusMsg && <ErrorMessage>{statusMsg}</ErrorMessage>}

      {/* Header row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "120px 1fr 140px 100px 120px",
          gap: 16,
          padding: "12px 24px",
          borderBottom: "var(--border-rule)",
          alignItems: "center",
        }}
      >
        <span className="label" style={{ opacity: 0.3, margin: 0 }}>Factuur</span>
        <span className="label" style={{ opacity: 0.3, margin: 0 }}>Klant</span>
        <span className="label" style={{ opacity: 0.3, margin: 0, textAlign: "right" }}>Bedrag</span>
        <span className="label" style={{ opacity: 0.3, margin: 0, textAlign: "center" }}>Status</span>
        <span className="label" style={{ opacity: 0.3, margin: 0, textAlign: "right" }}>Actie</span>
      </div>

      {/* Invoice rows */}
      {invoices.map((inv) => {
        const isOverdue = inv.days_overdue > 0;

        return (
          <div
            key={inv.id}
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr 140px 100px 120px",
              gap: 16,
              padding: "16px 24px",
              borderBottom: "var(--border-rule)",
              alignItems: "center",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(10,10,10,0.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <span className="mono-amount" style={{ fontSize: 12, opacity: 0.5 }}>
              {inv.invoice_number}
            </span>

            <Link
              href={`/dashboard/invoices/${inv.id}`}
              style={{
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
                color: "var(--foreground)",
                letterSpacing: "-0.01em",
                textTransform: "uppercase",
              }}
            >
              {inv.client_name}
            </Link>

            <span className="mono-amount" style={{ fontSize: 13, fontWeight: 500, textAlign: "right" }}>
              {formatCurrency(inv.total_inc_vat)}
            </span>

            <span
              className="label"
              style={{
                textAlign: "center",
                color: isOverdue ? "var(--color-reserved)" : "inherit",
                opacity: isOverdue ? 1 : 0.4,
                margin: 0,
              }}
            >
              {isOverdue ? `${inv.days_overdue}D` : "ACTIEF"}
            </span>

            <div style={{ textAlign: "right" }}>
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
                  }}
                >
                  {sendingId === inv.id ? "..." : "HERINNERING"}
                </button>
              ) : (
                <span className="label" style={{ opacity: 0.2 }}>—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
