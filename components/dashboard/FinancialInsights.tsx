"use client";

import { formatCurrency } from "@/lib/format";
import type { CashflowSummary } from "@/lib/actions/dashboard";
import type { SafeToSpendData } from "@/lib/types";

interface FinancialInsightsProps {
  cashflow: CashflowSummary;
  safeToSpend: SafeToSpendData;
}

/**
 * FinancialInsights — A fintech-grade financial intelligence panel.
 * Shows burn rate, runway, year-end tax projection, and cashflow trend.
 */
export function FinancialInsights({ cashflow, safeToSpend }: FinancialInsightsProps) {
  // Calculate average monthly expenses (burn rate)
  const totalExpenses = cashflow.monthlyExpenses.reduce((sum, m) => sum + m.amount, 0);
  const monthsWithData = cashflow.monthlyExpenses.filter((m) => m.amount > 0).length || 1;
  const avgBurnRate = totalExpenses / monthsWithData;

  // Runway: how many months until Safe-to-Spend hits 0
  const runway = avgBurnRate > 0
    ? Math.floor(safeToSpend.safeToSpend / avgBurnRate)
    : Infinity;

  // Year-end tax projection (annualized from current data)
  // ZZP deductions: zelfstandigenaftrek (€5.030) + startersaftrek (€2.123) in 2024
  const monthsElapsed = new Date().getMonth() + 1;
  const annualizedRevenue = (safeToSpend.estimatedIncomeTax / 0.37) * (12 / monthsElapsed) * (12 / 12);
  const zelfstandigenaftrek = 5030;
  const mkbWinstVrijstelling = annualizedRevenue * 0.14;
  const taxableProfit = Math.max(0, annualizedRevenue - zelfstandigenaftrek - mkbWinstVrijstelling);

  // Progressive Dutch IB rates (2024 simplified)
  let estimatedYearTax = 0;
  if (taxableProfit <= 75518) {
    estimatedYearTax = taxableProfit * 0.3693;
  } else {
    estimatedYearTax = 75518 * 0.3693 + (taxableProfit - 75518) * 0.4950;
  }

  // Trend emoji
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
        {/* Burn Rate */}
        <InsightCard
          label="Gem. kosten / mnd"
          value={formatCurrency(avgBurnRate)}
          sublabel="Laatste 6 maanden"
        />

        {/* Bereik */}
        <InsightCard
          label="Bereik"
          value={runway === Infinity ? "∞" : `${runway} mnd`}
          sublabel="Bij huidig tempo"
          highlight={runway < 3}
        />

        {/* Net trend */}
        <InsightCard
          label="Netto trend"
          value={`${trendIcon} ${formatCurrency(cashflow.netThisMonth)}`}
          sublabel={`Vorige maand: ${formatCurrency(cashflow.netLastMonth)}`}
        />

        {/* Year-end tax */}
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
          color: highlight ? "#c44" : "var(--foreground)",
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
