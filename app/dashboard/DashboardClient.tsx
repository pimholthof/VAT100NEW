"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { m as motion , type Variants } from "framer-motion";
import Link from "next/link";
import {
  getDashboardData,
  type DashboardData,
} from "@/features/dashboard/actions";
import type { ActionResult } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

import {
  StatCard,
  SkeletonTable,
  ErrorMessage,
} from "@/components/ui";
import { ActionFeed } from "@/features/dashboard/components/ActionFeed";
import { FiscalPulse } from "@/features/dashboard/components/FiscalPulse";
import { QuickReceiptUpload } from "@/features/dashboard/components/QuickReceiptUpload";
import { CashflowChart } from "@/features/dashboard/components/CashflowChart";
import { UpcomingInvoiceTable } from "@/features/dashboard/components/UpcomingInvoiceTable";



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




