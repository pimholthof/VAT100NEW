"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import {
  getDashboardData,
  type UpcomingInvoice,
  type DashboardData,
} from "@/lib/actions/dashboard";
import type { ActionResult } from "@/lib/types";
import { sendReminder } from "@/lib/actions/invoices";
import { formatCurrency } from "@/lib/format";
import { playSound } from "@/lib/utils/sound";

import {
  StatCard,
  SkeletonCard,
  SkeletonTable,
  ErrorMessage,
  ButtonSecondary,
} from "@/components/ui";
import { ActionFeed } from "@/components/dashboard/ActionFeed";
import { FiscalPulse } from "@/components/dashboard/FiscalPulse";
import { QuickReceiptUpload } from "@/components/dashboard/QuickReceiptUpload";

import { CashflowChart } from "@/components/dashboard/CashflowChart";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

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
    staleTime: 5 * 60 * 1000, // 5 min — dashboard data is expensive to fetch
  });

  const data = dashboardResult?.data;
  const stats = data?.stats;

  const upcomingInvoices = data?.upcomingInvoices;
  const cashflow = data?.cashflow;
  const vatDeadline = data?.vatDeadline;
  const safeToSpend = data?.safeToSpend;

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  useEffect(() => {
    const startHum = () => {
      import('@/lib/utils/sound').then(({ playAmbient }) => playAmbient());
      window.removeEventListener('click', startHum);
      window.removeEventListener('keydown', startHum);
    };
    window.addEventListener('click', startHum);
    window.addEventListener('keydown', startHum);
    return () => {
      window.removeEventListener('click', startHum);
      window.removeEventListener('keydown', startHum);
    };
  }, []);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
      className="dashboard-content"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 32,
        paddingBottom: 80
      }}
    >
      {/* ── 1. FISCAL PULSE (full-width hero) ── */}
      {safeToSpend && !isLoading && (
        <motion.div variants={itemVariants}>
          <FiscalPulse
            safeToSpend={safeToSpend.safeToSpend}
            currentBalance={safeToSpend.currentBalance}
            isLoading={isLoading}
          />
        </motion.div>
      )}

      {/* ── 2. METRICS ROW (3-col grid) ── */}
      {!isLoading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div variants={itemVariants}>
            <StatCard
              label="Openstaand"
              value={String(stats.openInvoiceCount)}
              numericValue={stats.openInvoiceCount}
              sub={formatCurrency(stats.openInvoiceAmount)}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              label="BTW-Reserve"
              value={formatCurrency(stats.vatToPay)}
              numericValue={stats.vatToPay}
              sub="Q-Prognose"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <QuickReceiptUpload />
          </motion.div>
        </div>
      )}

      {/* ── 3. ACTIEPROTOCOL (full-width) ── */}
      {!isLoading && (
        <motion.div variants={itemVariants}>
          <ActionFeed />
        </motion.div>
      )}

      {/* ── 4. CASHFLOW (full-width) ── */}
      {cashflow && (
        <motion.div
          variants={itemVariants}
          style={{
            padding: "32px",
            border: "var(--border-light)"
          }}
        >
          <p className="label" style={{ marginBottom: 24, opacity: 0.4 }}>Liquiditeit / Prognose</p>
          <CashflowChart cashflow={cashflow} />
        </motion.div>
      )}

      {/* ── 5. DOSSIER / OPENSTAAND ── */}
      <motion.div variants={itemVariants}>
        <h2 className="section-header" style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 16, opacity: 0.5 }}>
          Dossier / Openstaand
          <span style={{ flex: 1, height: "0.5px", background: "rgba(0,0,0,0.04)" }} />
        </h2>
        {isLoading ? (
          <SkeletonTable />
        ) : upcomingInvoices && upcomingInvoices.length > 0 ? (
          <UpcomingInvoiceTable invoices={upcomingInvoices} />
        ) : (
          <p className="empty-state">Geen actieve componenten</p>
        )}
      </motion.div>

    </motion.div>
  );
}



/* ── Upcoming Invoice Editorial Layout ── */

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
      playSound("glass-ping");
    }
    setSendingId(null);
  };

  return (
    <div style={{ border: "var(--border-light)" }}>
      {statusMsg && <ErrorMessage>{statusMsg}</ErrorMessage>}

      {/* Header row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr 140px 100px 120px",
        gap: 16,
        padding: "12px 24px",
        borderBottom: "var(--border-rule)",
        alignItems: "center"
      }}>
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
              transition: "background 0.15s ease"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.015)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
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
                textTransform: "uppercase"
              }}
            >
              {inv.client_name}
            </Link>

            <span className="mono-amount" style={{ fontSize: 13, fontWeight: 500, textAlign: "right" }}>
              {formatCurrency(inv.total_inc_vat)}
            </span>

            <span className="label" style={{
              textAlign: "center",
              color: isOverdue ? "#DE350B" : "inherit",
              opacity: isOverdue ? 1 : 0.4,
              margin: 0
            }}>
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

