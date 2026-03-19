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
    <div style={{ display: "flex", flexDirection: "column", gap: 48, paddingBottom: 80 }}>
      {/* ── 1. HERO: Vrij te besteden ── */}
      {safeToSpend && !isLoading && (
        <section style={{ paddingTop: 16, paddingBottom: 48, borderBottom: "var(--border-light)" }}>
          <p className="hero-label" style={{ marginBottom: 16 }}>
            Vrij te besteden
          </p>
          <p className="hero-amount">
            {formatCurrency(safeToSpend.safeToSpend)}
          </p>
        </section>
      )}

      {/* ── 2. KERNGETALLEN ── */}
      {!isLoading && stats && (
        <section>
          <h2 className="section-header section-divider" style={{ opacity: 0.4 }}>
            Kerngetallen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label="Openstaand"
              value={String(stats.openInvoiceCount)}
              sub={formatCurrency(stats.openInvoiceAmount)}
            />
            <StatCard
              label="BTW-reserve"
              value={formatCurrency(stats.vatToPay)}
              sub="Kwartaalprognose"
            />
            <QuickReceiptUpload />
          </div>
        </section>
      )}

      {/* ── 3. DOSSIER / OPENSTAAND ── */}
      <section>
        <h2 className="section-header section-divider" style={{ opacity: 0.4 }}>
          Openstaande facturen
        </h2>
        {isLoading ? (
          <SkeletonTable />
        ) : upcomingInvoices && upcomingInvoices.length > 0 ? (
          <UpcomingInvoiceTable invoices={upcomingInvoices} />
        ) : (
          <p className="empty-state">Geen openstaande facturen</p>
        )}
      </section>
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

  const cols = "120px 1fr 140px 100px 120px";

  return (
    <div className="data-table">
      {statusMsg && <ErrorMessage>{statusMsg}</ErrorMessage>}

      {/* Header */}
      <div className="data-table-header" style={{ gridTemplateColumns: cols }}>
        <span>Factuur</span>
        <span>Klant</span>
        <span style={{ textAlign: "right" }}>Bedrag</span>
        <span style={{ textAlign: "center" }}>Status</span>
        <span style={{ textAlign: "right" }}>Actie</span>
      </div>

      {/* Rows */}
      {invoices.map((inv) => {
        const isOverdue = inv.days_overdue > 0;

        return (
          <div
            key={inv.id}
            className="data-table-row"
            style={{ gridTemplateColumns: cols }}
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
              {isOverdue ? (
                <>
                  <span className="status-dot" data-status="overdue" />
                  {inv.days_overdue}D
                </>
              ) : (
                <>
                  <span className="status-dot" data-status="active" />
                  ACTIEF
                </>
              )}
            </span>

            <div style={{ textAlign: "right" }}>
              {inv.client_email ? (
                <button
                  onClick={() => handleSendReminder(inv.id)}
                  disabled={sendingId === inv.id}
                  className="table-action"
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
