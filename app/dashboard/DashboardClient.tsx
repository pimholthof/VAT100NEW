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
      className="dashboard-content-inner"
    >
      {/* ── TOP ROW: QUICK ACTION + METRICS ── */}
      {!isLoading && (
        <div className="flex flex-col gap-6">
          <motion.div variants={itemVariants}>
            <QuickReceiptUpload />
          </motion.div>

          {stats && (
            <div className="brutalist-grid-2">
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
                  label="BTW apart zetten"
                  value={formatCurrency(stats.vatToPay)}
                  numericValue={stats.vatToPay}
                  sub="Dit kwartaal"
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
          className="flex flex-col relative brutalist-panel"
        >
          <div className="vertical-label brutalist-label">AI-assistent</div>
          <div className="brutalist-panel-header">
             <p className="label">Wat je nog moet checken</p>
          </div>
          <div className="brutalist-panel-content">
            <ActionFeed />
          </div>
        </motion.div>
      )}

      {/* ── CASHFLOW ── */}
      {cashflow && (
        <motion.div 
          variants={itemVariants}
          className="brutalist-panel brutalist-panel-padded"
        >
          <div className="brutalist-panel-header minimal">
            <p className="label">Geld in kas</p>
          </div>
          <CashflowChart cashflow={cashflow} />
        </motion.div>
      )}

      {/* ── OPEN INVOICES ── */}
      <motion.div variants={itemVariants}>
        <h2 className="brutalist-section-title">
          <span>Openstaande facturen</span>
          <span className="brutalist-rule" />
        </h2>
        {isLoading ? (
          <SkeletonTable />
        ) : upcomingInvoices && upcomingInvoices.length > 0 ? (
          <UpcomingInvoiceTable invoices={upcomingInvoices} />
        ) : (
          <p className="empty-state">Geen openstaande facturen</p>
        )}
      </motion.div>

    </motion.div>
  );
}
