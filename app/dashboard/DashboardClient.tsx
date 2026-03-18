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
      {/* ── EDITORIAL GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 pt-10">
        
        {/* ── LEFT COLUMN: OPERATIONAL STACK (Span 4) ── */}
        <div className="lg:col-span-4 flex flex-col gap-32 lg:sticky top-40 pb-10 relative z-10">
          
          {/* 1. Quick Action (Playful offset) */}
          {!isLoading && (
            <motion.div variants={itemVariants} className="lg:-ml-8">
              <QuickReceiptUpload />
            </motion.div>
          )}

          {/* 2. Tactical Metrics */}
          {!isLoading && stats && (
            <div className="flex flex-col gap-10">
              <motion.div variants={itemVariants}>
                <StatCard
                  label="Openstaand"
                  value={String(stats.openInvoiceCount)}
                  numericValue={stats.openInvoiceCount}
                  sub={formatCurrency(stats.openInvoiceAmount)}
                />
              </motion.div>
              <motion.div variants={itemVariants} className="ml-10 lg:ml-20">
                <StatCard
                  label="BTW-Reserve"
                  value={formatCurrency(stats.vatToPay)}
                  numericValue={stats.vatToPay}
                  sub="Q-Prognose"
                />
              </motion.div>
            </div>
          )}

          {/* 3. Action Protocol */}
          {!isLoading && (
            <motion.div 
              variants={itemVariants}
              className="flex flex-col relative bg-[var(--background)] lg:-ml-6"
              style={{ 
                height: 500, // Fixed height for the feed
                border: "var(--border-light)",
              }}
            >
              <div className="vertical-label" style={{ right: -15, fontSize: 8 }}>Intelligentielaag</div>
              <div style={{ padding: "32px 32px 20px", borderBottom: "var(--border-rule)" }}>
                 <p className="label">Anticipatieprotocol</p>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 24px" }}>
                <ActionFeed />
              </div>
            </motion.div>
          )}
        </div>

        {/* ── RIGHT COLUMN: STRATEGIC CANVAS (Span 8) ── */}
        <div className="lg:col-span-8 flex flex-col gap-32 lg:gap-48 lg:pt-32">
          
          {/* 1. Fiscal Pulse Hero */}
          {safeToSpend && !isLoading && (
            <div className="lg:-mr-12 relative z-0">
              <FiscalPulse 
                safeToSpend={safeToSpend.safeToSpend} 
                currentBalance={safeToSpend.currentBalance} 
                isLoading={isLoading}
              />
            </div>
          )}

          {/* 2. Cashflow Projection */}
          {cashflow && (
            <motion.div 
              variants={itemVariants}
              className="p-8 lg:p-10 border border-[rgba(34,34,34,0.1)] lg:ml-12"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
                <p className="label">Liquiditeit / Prognose</p>
              </div>
              <CashflowChart cashflow={cashflow} />
            </motion.div>
          )}

          {/* 3. The Ledger Gallery */}
          <motion.div variants={itemVariants} style={{ marginTop: 40 }}>
            <h2 className="section-header" style={{ marginBottom: 60, display: "flex", alignItems: "center", gap: 24, opacity: 0.5 }}>
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
        </div>
      </div>

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
    <div style={{ marginBottom: 120, position: "relative" }}>
      {/* Playful editorial background line */}
      <div style={{ position: "absolute", left: "5%", top: 0, bottom: 0, width: "1px", background: "rgba(0,0,0,0.03)", zIndex: 0 }} />
      
      {statusMsg && <ErrorMessage>{statusMsg}</ErrorMessage>}
      
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: 160, // Extreme gap for editorial spacing
        position: "relative",
        zIndex: 1
      }}>
        {invoices.map((inv, index) => {
          const isOverdue = inv.days_overdue > 0;
          // Asymmetrical staggered layout: alternate margins
          const alignClass = index % 2 === 0 ? "items-start pl-0 lg:pl-[10%]" : "items-end pr-0 lg:pr-[10%]";
          
          return (
            <div 
              key={inv.id} 
              className={`flex flex-col relative ${alignClass}`}
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
                  fontSize: "clamp(3rem, 6vw, 6rem)", // Massive scaling
                  textDecoration: "none",
                  color: "var(--foreground)",
                  lineHeight: 0.9,
                  display: "inline-block",
                  borderBottom: "4px solid transparent",
                  transition: "border-color 0.3s ease",
                  marginBottom: 24,
                  letterSpacing: "-0.04em"
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
                    {sendingId === inv.id ? "SYNC..." : "PING STUREN"}
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

