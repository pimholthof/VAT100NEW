"use client";

import { m as motion } from "framer-motion";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

interface ReportClientProps {
  year: number;
  stats: {
    totalRevenue: number;
    totalCredit: number;
    netRevenue: number;
    totalVat: number;
    paidAmount: number;
    openAmount: number;
    quoteTotal: number;
    conversionRate: number;
  };
  invoiceCount: number;
  quoteCount: number;
  studioName: string;
}

export default function ReportClient({
  year,
  stats,
  invoiceCount,
  quoteCount,
  studioName,
}: ReportClientProps) {
  return (
    <div className="dashboard-content-inner">
      {/* ── BRUTALIST HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="brutalist-report-header"
      >
        <div className="brutalist-mark">VAT100</div>
        <div className="brutalist-meta">
          <span className="label">Jaaroverzicht</span>
          <span className="brutalist-year">{year}</span>
        </div>
      </motion.div>

      {/* ── STUDIO INTRO ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="brutalist-intro"
      >
        <h1 className="brutalist-studio-name">{studioName}</h1>
        <p className="brutalist-period">
          Periode: januari — december {year}
        </p>
      </motion.div>

      {/* ── KEY METRICS GRID ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="brutalist-metrics-grid"
      >
        <MetricBlock
          label="Netto omzet"
          value={formatCurrency(stats.netRevenue)}
          large
        />
        <MetricBlock
          label="Gefactureerd"
          value={formatCurrency(stats.totalRevenue)}
          sub={stats.totalCredit > 0 ? `-${formatCurrency(stats.totalCredit)} credit` : undefined}
        />
        <MetricBlock
          label="BTW afgedragen"
          value={formatCurrency(stats.totalVat)}
        />
        <MetricBlock
          label="Reeds betaald"
          value={formatCurrency(stats.paidAmount)}
          sub={`${formatCurrency(stats.openAmount)} openstaand`}
        />
      </motion.div>

      {/* ── SECONDARY STATS ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="brutalist-secondary-grid"
      >
        <StatBlock label="Facturen" value={invoiceCount} />
        <StatBlock label="Offertes" value={quoteCount} />
        <StatBlock label="Conversie" value={`${stats.conversionRate}%`} />
        <StatBlock 
          label="Potentiële omzet" 
          value={formatCurrency(stats.quoteTotal)}
        />
      </motion.div>

      {/* ── ACTIONS ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="brutalist-actions"
      >
        <Link href="/dashboard" className="brutalist-action-link">
          ← Terug naar dashboard
        </Link>
        <button 
          onClick={() => window.print()}
          className="brutalist-action-link"
        >
          Print rapport
        </button>
      </motion.div>
    </div>
  );
}

function MetricBlock({
  label,
  value,
  sub,
  large = false,
}: {
  label: string;
  value: string;
  sub?: string;
  large?: boolean;
}) {
  return (
    <div className={`brutalist-metric ${large ? "brutalist-metric-large" : ""}`}>
      <span className="brutalist-metric-label">{label}</span>
      <span className="brutalist-metric-value">{value}</span>
      {sub && <span className="brutalist-metric-sub">{sub}</span>}
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="brutalist-stat">
      <span className="brutalist-stat-label">{label}</span>
      <span className="brutalist-stat-value">{value}</span>
    </div>
  );
}
