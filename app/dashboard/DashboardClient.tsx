"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { m as motion , type Variants } from "framer-motion";
import {
  getDashboardData,
  type DashboardData,
} from "@/features/dashboard/actions";
import type { ActionResult } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

import {
  StatCard,
  SkeletonTable,
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
        gap: 48,
        paddingBottom: 120
      }}
    >
      {/* ── TOP ROW: QUICK ACTION + METRICS ── */}
      {!isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <motion.div variants={itemVariants}>
            <QuickReceiptUpload />
          </motion.div>

          {stats && (
            <div className="responsive-grid-2">
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
            </div>
          )}
        </div>
      )}

      {/* ── FISCAL PULSE ── */}
      {safeToSpend && !isLoading && (
        <motion.div variants={itemVariants}>
          <FiscalPulse 
            safeToSpend={safeToSpend.safeToSpend} 
            currentBalance={safeToSpend.currentBalance} 
            isLoading={isLoading}
          />
        </motion.div>
      )}

      {/* ── ACTION FEED ── */}
      {!isLoading && (
        <motion.div 
          variants={itemVariants}
          className="flex flex-col relative"
          style={{ 
            background: "var(--background)",
            height: 400,
            border: "var(--border-light)",
          }}
        >
          <div className="vertical-label" style={{ right: -15, fontSize: 8 }}>Intelligentielaag</div>
          <div style={{ padding: "24px 24px 16px", borderBottom: "var(--border-rule)" }}>
             <p className="label">Anticipatieprotocol</p>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 24px" }}>
            <ActionFeed />
          </div>
        </motion.div>
      )}

      {/* ── CASHFLOW ── */}
      {cashflow && (
        <motion.div 
          variants={itemVariants}
          style={{ padding: "24px", border: "1px solid rgba(34,34,34,0.1)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <p className="label">Liquiditeit / Prognose</p>
          </div>
          <CashflowChart cashflow={cashflow} />
        </motion.div>
      )}

      {/* ── OPEN INVOICES ── */}
      <motion.div variants={itemVariants}>
        <h2 className="section-header" style={{ marginBottom: 40, display: "flex", alignItems: "center", gap: 24, opacity: 0.5 }}>
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
