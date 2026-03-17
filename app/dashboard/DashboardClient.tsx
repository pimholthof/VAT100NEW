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
            staggerChildren: 0.12,
          },
        },
      }}
      className="dashboard-content"
      style={{ 
        display: "flex",
        flexDirection: "column",
        gap: 60,
        paddingBottom: 160
      }}
    >
      {safeToSpend && !isLoading && (
        <FiscalPulse 
          safeToSpend={safeToSpend.safeToSpend} 
          currentBalance={safeToSpend.currentBalance} 
          isLoading={isLoading}
        />
      )}

      {/* ── Secondary row: Stats and Actions ── */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(12, 1fr)", 
        gap: 40,
        alignItems: "start"
      }}>
        {/* Stats Column (8 cols) */}
        <div style={{ 
          gridColumn: "span 8", 
          display: "grid", 
          gridTemplateColumns: "repeat(2, 1fr)", 
          gap: 40 
        }}>
          {!isLoading && stats && (
            <>
              <motion.div variants={itemVariants}>
                <StatCard
                  label="Outstanding"
                  value={String(stats.openInvoiceCount)}
                  numericValue={stats.openInvoiceCount}
                  sub={formatCurrency(stats.openInvoiceAmount)}
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <StatCard
                  label="Tax Reserve"
                  value={formatCurrency(stats.vatToPay)}
                  numericValue={stats.vatToPay}
                  sub="BTW Q-Forecast"
                />
              </motion.div>
            </>
          )}

          {cashflow && (
            <motion.div 
              variants={itemVariants}
              className="glass tilted-canvas"
              style={{ 
                gridColumn: "span 2", 
                padding: 40, 
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
                <p className="label">Cashflow / Projection</p>
              </div>
              <CashflowChart cashflow={cashflow} />
            </motion.div>
          )}
        </div>

        {/* Action Column (4 cols) */}
        <div style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: 40 }}>
          {!isLoading && (
            <motion.div 
              variants={itemVariants}
              className="glass"
              style={{ 
                height: 500,
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              <div className="vertical-label" style={{ right: -15, fontSize: 8 }}>Intelligence Buffer</div>
              <div style={{ padding: "32px 32px 20px", borderBottom: "var(--border-rule)" }}>
                 <p className="label">Agentic Anticipation</p>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 24px" }}>
                <ActionFeed />
              </div>
            </motion.div>
          )}

          {!isLoading && (
            <motion.div 
              variants={itemVariants}
              className="glass tilted-canvas"
              style={{ 
                padding: 40,
                textAlign: "center"
              }}
            >
              <QuickReceiptUpload />
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Table: Bottom section ── */}
      <motion.div variants={itemVariants} style={{ marginTop: 40 }}>
        <h2 className="section-header" style={{ marginBottom: 40, display: "flex", alignItems: "center", gap: 24, opacity: 0.5 }}>
          Ledger / Open
          <span style={{ flex: 1, height: "0.5px", background: "rgba(0,0,0,0.04)" }} />
        </h2>
        {isLoading ? (
          <SkeletonTable />
        ) : upcomingInvoices && upcomingInvoices.length > 0 ? (
          <UpcomingInvoiceTable invoices={upcomingInvoices} />
        ) : (
          <p className="empty-state">No active fiscal items</p>
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
      // Eno-inspired ritual: glass-ping for precision
      playSound("glass-ping");
    }
    setSendingId(null);
  };

  return (
    <div style={{ marginBottom: 120 }}>
      {statusMsg && <ErrorMessage>{statusMsg}</ErrorMessage>}
      
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: 80, // Massive gap for editorial spacing
      }}>
        {invoices.map((inv, index) => {
          const isOverdue = inv.days_overdue > 0;
          // Asymmetrical staggered layout: alternate margins
          const staggerMargin = index % 2 === 0 ? "0 0 0 10%" : "0 10% 0 0";
          const align = index % 2 === 0 ? "flex-start" : "flex-end";
          
          return (
            <div 
              key={inv.id} 
              style={{ 
                margin: staggerMargin,
                display: "flex",
                flexDirection: "column",
                alignItems: align,
                position: "relative",
              }}
            >
              {/* Top tiny label */}
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                <span className="label-strong" style={{ fontSize: 10, letterSpacing: "0.1em" }}>
                  FACTURE // {inv.invoice_number}
                </span>
                <span className="label" style={{ 
                  color: isOverdue ? "#DE350B" : "inherit", 
                  opacity: isOverdue ? 1 : 0.4 
                }}>
                  [{isOverdue ? `${inv.days_overdue}D DELAY` : "ACTIVE"}]
                </span>
              </div>

              {/* Main Subject */}
              <Link
                href={`/dashboard/invoices/${inv.id}`}
                className="display-title"
                style={{
                  fontSize: "3rem",
                  textDecoration: "none",
                  color: "var(--foreground)",
                  lineHeight: 1,
                  display: "inline-block",
                  borderBottom: "2px solid transparent",
                  transition: "border-color 0.3s ease",
                  marginBottom: 16
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--foreground)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "transparent";
                }}
              >
                {inv.client_name.toUpperCase()}
              </Link>
              
              {/* Bottom Details & Action */}
              <div style={{ display: "flex", gap: 32, alignItems: "baseline" }}>
                <span className="label-strong" style={{ fontSize: 14 }}>
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
                      borderBottom: "1px solid var(--foreground)",
                      cursor: "pointer",
                      padding: "0 0 2px 0",
                      opacity: sendingId === inv.id ? 0.2 : 0.8,
                    }}
                  >
                    {sendingId === inv.id ? "SYNCING..." : "SEND PING"}
                  </button>
                ) : (
                  <span className="label" style={{ opacity: 0.2 }}>
                    NO EMAIL
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

