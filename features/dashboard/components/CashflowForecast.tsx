"use client";

import type { CashflowForecastWeek } from "@/features/dashboard/actions";
import { formatCurrency } from "@/lib/format";

export function CashflowForecast({
  weeks,
}: {
  weeks: CashflowForecastWeek[];
}) {
  if (!weeks || weeks.length === 0) return null;

  // Toon max 6 weken
  const visibleWeeks = weeks.slice(0, 6);
  const hasNegativeBalance = visibleWeeks.some((w) => w.runningBalance < 0);
  const allEvents = visibleWeeks.flatMap((w) => w.events).filter(Boolean);

  return (
    <div>
      <h2 className="brutalist-section-title">
        <span>Cashflow</span>
        <span className="brutalist-rule" />
      </h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "var(--text-body-sm)",
          marginBottom: allEvents.length > 0 || hasNegativeBalance ? 12 : 0,
        }}
      >
        <thead>
          <tr>
            <th style={thStyle}>Week</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Verwacht</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {visibleWeeks.map((week, i) => {
            const weekDate = new Date(week.weekStart);
            const label = weekDate.toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "short",
            });
            const isNegative = week.runningBalance < 0;
            const isCurrentWeek = i === 0;

            return (
              <tr
                key={week.weekStart}
                style={{
                  borderBottom: "0.5px solid rgba(0,0,0,0.06)",
                  background: isNegative ? "rgba(220,38,38,0.04)" : "transparent",
                }}
              >
                <td style={{ ...tdStyle, fontWeight: isCurrentWeek ? 600 : 400, opacity: isCurrentWeek ? 1 : 0.6 }}>
                  {isCurrentWeek ? "Nu" : label}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--font-geist-mono)", opacity: 0.5 }}>
                  {week.expectedIncome > 0 ? `+${formatCurrency(week.expectedIncome)}` : "—"}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "right",
                    fontFamily: "var(--font-geist-mono)",
                    fontWeight: 600,
                    color: isNegative ? "#DC2626" : "inherit",
                  }}
                >
                  {formatCurrency(week.runningBalance)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {(hasNegativeBalance || allEvents.length > 0) && (
        <p style={{ fontSize: "11px", opacity: 0.4, margin: "0 0 16px", lineHeight: 1.5 }}>
          {hasNegativeBalance && "Let op: saldo daalt onder €0. "}
          {allEvents.length > 0 && allEvents.join(" · ")}
        </p>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 4px",
  textAlign: "left",
  fontSize: "10px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  opacity: 0.25,
  borderBottom: "0.5px solid rgba(0,0,0,0.12)",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 4px",
};
