"use client";

import { formatCurrency } from "@/lib/format";
import { estimateIncomeTax } from "@/lib/tax";
import type { CashflowSummary } from "@/lib/actions/dashboard";
import type { SafeToSpendData } from "@/lib/types";

interface FinancialInsightsProps {
  cashflow: CashflowSummary;
  safeToSpend: SafeToSpendData;
}

/**
 * FinancialInsights — Financieel inzichtpaneel.
 * Toont burn rate, bereik, jaarschatting IB en cashflow trend.
 */
export function FinancialInsights({ cashflow, safeToSpend }: FinancialInsightsProps) {
  const totalExpenses = cashflow.monthlyExpenses.reduce((sum, m) => sum + m.amount, 0);
  const monthsWithData = cashflow.monthlyExpenses.filter((m) => m.amount > 0).length || 1;
  const avgBurnRate = totalExpenses / monthsWithData;

  const runway = avgBurnRate > 0
    ? Math.floor(safeToSpend.safeToSpend / avgBurnRate)
    : Infinity;

  // Jaarschatting IB via gedeelde tax module (progressieve schijven 2025)
  const monthsElapsed = new Date().getMonth() + 1;
  const annualizedRevenue = monthsElapsed > 0
    ? (safeToSpend.yearRevenueExVat / monthsElapsed) * 12
    : 0;
  const estimatedYearTax = estimateIncomeTax(annualizedRevenue);

  const trendIcon = cashflow.trend === "up" ? "↑" : cashflow.trend === "down" ? "↓" : "→";

  return (
    <div style={{ marginBottom: "var(--space-section)" }}>
      <h2 className="section-header" style={{ margin: "0 0 20px" }}>
        Financieel Inzicht
      </h2>

      <div
        className="stat-cards-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 1,
          background: "rgba(13,13,11,0.08)",
          border: "1px solid rgba(13,13,11,0.08)",
        }}
      >
        <InsightCard
          label="Gem. kosten / mnd"
          value={formatCurrency(avgBurnRate)}
          sublabel="Laatste 6 maanden"
        />

        <InsightCard
          label="Bereik"
          value={runway === Infinity ? "∞" : `${runway} mnd`}
          sublabel="Bij huidig tempo"
          highlight={runway < 3}
        />

        <InsightCard
          label="Netto trend"
          value={`${trendIcon} ${formatCurrency(cashflow.netThisMonth)}`}
          sublabel={`Vorige maand: ${formatCurrency(cashflow.netLastMonth)}`}
        />

        <InsightCard
          label="IB jaarschatting"
          value={formatCurrency(Math.round(estimatedYearTax))}
          sublabel={`Na aftrekposten (ZA + MKB)`}
        />
      </div>
    </div>
  );
}

function InsightCard({
  label,
  value,
  sublabel,
  highlight = false,
}: {
  label: string;
  value: string;
  sublabel: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--background)",
        padding: 20,
      }}
    >
      <p className="label" style={{ margin: "0 0 8px", opacity: 0.55 }}>
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "var(--text-display-sm)",
          fontWeight: 700,
          letterSpacing: "var(--tracking-display)",
          margin: "0 0 4px",
          color: highlight ? "var(--color-reserved)" : "var(--foreground)",
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-xs)",
          fontWeight: 300,
          opacity: 0.45,
          margin: 0,
        }}
      >
        {sublabel}
      </p>
    </div>
  );
}
