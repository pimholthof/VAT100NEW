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
} from "@/components/ui";
import { FiscalPulse } from "@/features/dashboard/components/FiscalPulse";



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
      className="dashboard-content w-full"
      style={{ 
        gap: 32,
        paddingBottom: 120,
        alignItems: "start"
      }}
    >
      {/* ── CENTERED BLOCKS CONTAINER (max-width 1000px) ── */}
      <div className="w-full max-w-[1000px] mx-auto flex flex-col" style={{ gap: 32 }}>
        {!isLoading && safeToSpend && stats && (
          <motion.div variants={itemVariants} className="flex flex-col" style={{ gap: 32 }}>
            <FiscalPulse 
              safeToSpend={safeToSpend.safeToSpend} 
              currentBalance={safeToSpend.currentBalance} 
              isLoading={isLoading}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 32 }}>
              <StatCard
                label="Openstaand"
                value={String(stats.openInvoiceCount)}
                numericValue={stats.openInvoiceCount}
                isCurrency={false}
                sub={formatCurrency(stats.openInvoiceAmount)}
              />
              <StatCard
                label="BTW-Reserve"
                value={formatCurrency(stats.vatToPay)}
                numericValue={stats.vatToPay}
                sub="Kwartaalprognose"
              />
            </div>
          </motion.div>
        )}
      </div>


    </motion.div>
  );
}
