"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { m as motion, type Variants } from "framer-motion";
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
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  useEffect(() => {
    const startHum = () => {
      import("@/lib/utils/sound").then(({ playAmbient }) => playAmbient());
      window.removeEventListener("click", startHum);
      window.removeEventListener("keydown", startHum);
    };
    window.addEventListener("click", startHum);
    window.addEventListener("keydown", startHum);
    return () => {
      window.removeEventListener("click", startHum);
      window.removeEventListener("keydown", startHum);
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
            staggerChildren: 0.08,
          },
        },
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-section, 48px)",
        paddingBottom: 80,
      }}
    >
      {/* Quick Upload + Metrics */}
      {!isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <motion.div variants={itemVariants}>
            <QuickReceiptUpload />
          </motion.div>

          {stats && (
            <div className="responsive-grid-3">
              <motion.div variants={itemVariants}>
                <StatCard
                  label="Omzet deze maand"
                  value={formatCurrency(stats.revenueThisMonth)}
                  numericValue={stats.revenueThisMonth}
                />
              </motion.div>
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

      {/* Fiscal Pulse */}
      {safeToSpend && !isLoading && (
        <motion.div variants={itemVariants}>
          <FiscalPulse
            safeToSpend={safeToSpend.safeToSpend}
            currentBalance={safeToSpend.currentBalance}
            isLoading={isLoading}
          />
        </motion.div>
      )}

      {/* Action Feed */}
      {!isLoading && (
        <motion.div
          variants={itemVariants}
          style={{
            background: "var(--background)",
            height: 380,
            border: "0.5px solid rgba(0,0,0,0.06)",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <div style={{ padding: "20px 24px", borderBottom: "0.5px solid rgba(0,0,0,0.04)" }}>
            <p className="label" style={{ opacity: 0.3 }}>Anticipatieprotocol</p>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 20px" }}>
            <ActionFeed />
          </div>
        </motion.div>
      )}

      {/* Cashflow */}
      {cashflow && (
        <motion.div
          variants={itemVariants}
          style={{ padding: 24, border: "0.5px solid rgba(0,0,0,0.06)" }}
        >
          <div style={{ marginBottom: 28 }}>
            <p className="label" style={{ opacity: 0.3 }}>Liquiditeit / Prognose</p>
          </div>
          <CashflowChart cashflow={cashflow} />
        </motion.div>
      )}

      {/* Open Invoices */}
      <motion.div variants={itemVariants}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 32,
        }}>
          <h2 className="section-header" style={{ opacity: 0.4, whiteSpace: "nowrap" }}>
            Openstaand
          </h2>
          <span style={{ flex: 1, height: "0.5px", background: "rgba(0,0,0,0.04)" }} />
        </div>
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
