"use client";

import { formatCurrency } from "@/lib/format";
import type { CashflowSummary } from "@/lib/actions/dashboard";

/**
 * CashflowChart — A pure CSS bar chart showing monthly revenue vs expenses.
 * No external charting library needed. Clean, lightweight, editorial.
 */
export function CashflowChart({ cashflow }: { cashflow: CashflowSummary }) {
  const { monthlyRevenue, monthlyExpenses } = cashflow;

  // Find the max value for scaling
  const allAmounts = [
    ...monthlyRevenue.map((m) => m.amount),
    ...monthlyExpenses.map((m) => m.amount),
  ];
  const maxAmount = Math.max(...allAmounts, 1);

  const months = monthlyRevenue.map((rev, i) => {
    const exp = monthlyExpenses[i];
    const net = rev.amount - exp.amount;
    // Format month label: "jan", "feb", etc.
    const [year, month] = rev.month.split("-");
    const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
      "nl-NL",
      { month: "short" }
    );
    return { label, revenue: rev.amount, expenses: exp.amount, net };
  });

  return (
    <div style={{ marginBottom: "var(--space-section)" }}>
      <h2 className="section-header" style={{ margin: "0 0 20px" }}>
        Cashflow
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${months.length}, 1fr)`,
          gap: 8,
          alignItems: "end",
          height: 160,
          borderBottom: "0.5px solid rgba(13,13,11,0.12)",
          paddingBottom: 8,
        }}
      >
        {months.map((m, i) => {
          const revHeight = Math.max(2, (m.revenue / maxAmount) * 140);
          const expHeight = Math.max(2, (m.expenses / maxAmount) * 140);

          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 3,
                alignItems: "flex-end",
                justifyContent: "center",
                height: "100%",
              }}
            >
              {/* Revenue bar */}
              <div
                title={`Inkomsten: ${formatCurrency(m.revenue)}`}
                style={{
                  width: 16,
                  height: revHeight,
                  background: "var(--foreground)",
                  transition: "height 0.3s ease",
                }}
              />
              {/* Expense bar */}
              <div
                title={`Uitgaven: ${formatCurrency(m.expenses)}`}
                style={{
                  width: 16,
                  height: expHeight,
                  background: "rgba(13,13,11,0.15)",
                  transition: "height 0.3s ease",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Month labels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${months.length}, 1fr)`,
          gap: 8,
          marginTop: 6,
        }}
      >
        {months.map((m, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "10px",
              fontWeight: 400,
              opacity: 0.45,
              textTransform: "lowercase",
            }}
          >
            {m.label}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, background: "var(--foreground)" }} />
          <span className="label" style={{ opacity: 0.5 }}>Inkomsten</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, background: "rgba(13,13,11,0.15)" }} />
          <span className="label" style={{ opacity: 0.5 }}>Uitgaven</span>
        </div>
      </div>
    </div>
  );
}
