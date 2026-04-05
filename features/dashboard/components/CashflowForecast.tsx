"use client";

import type { CashflowForecastWeek } from "@/features/dashboard/actions";
import { formatCurrency } from "@/lib/format";

export function CashflowForecast({
  weeks,
  hasBank = true,
}: {
  weeks: CashflowForecastWeek[];
  hasBank?: boolean;
}) {
  if (!weeks || weeks.length === 0) return null;

  const visibleWeeks = weeks.slice(0, 6);
  const allEvents = visibleWeeks.flatMap((w) => w.events).filter(Boolean);

  // Zonder bank: toon geen forecast, alleen verwachte inkomsten
  const hasAnyData = visibleWeeks.some(
    (w) => w.expectedIncome > 0 || (hasBank && w.runningBalance !== 0)
  );

  // Alleen rood tonen als er daadwerkelijk een bankbalans is die negatief wordt
  const hasNegativeBalance = hasBank && visibleWeeks.some((w) => w.runningBalance < 0);

  if (!hasBank && !hasAnyData) {
    return null; // Verberg forecast als er geen bank en geen data is
  }

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
          marginBottom: allEvents.length > 0 || hasNegativeBalance ? 12 : 0,
        }}
      >
        <thead>
          <tr>
            <th style={thStyle}>Week</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Verwacht</th>
            {hasBank && <th style={{ ...thStyle, textAlign: "right" }}>Saldo</th>}
          </tr>
        </thead>
        <tbody>
          {visibleWeeks.map((week, i) => {
            const weekDate = new Date(week.weekStart);
            const label = weekDate.toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "short",
            });
            const isNegative = hasBank && week.runningBalance < 0;
            const isCurrentWeek = i === 0;

            return (
              <tr
                key={week.weekStart}
                style={{
                  borderBottom: "0.5px solid rgba(0,0,0,0.06)",
                  background: isNegative ? "rgba(220,38,38,0.04)" : "transparent",
                }}
              >
                <td style={{ ...tdStyle, fontWeight: isCurrentWeek ? 600 : 400, opacity: isCurrentWeek ? 1 : 0.5 }}>
                  {isCurrentWeek ? "Nu" : label}
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  {week.expectedIncome > 0 ? (
                    <span style={{ fontWeight: 500 }}>+{formatCurrency(week.expectedIncome)}</span>
                  ) : (
                    <span style={{ opacity: 0.25 }}>—</span>
                  )}
                </td>
                {hasBank && (
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontWeight: 600,
                      color: isNegative ? "#DC2626" : "inherit",
                    }}
                  >
                    {formatCurrency(week.runningBalance)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {(hasNegativeBalance || allEvents.length > 0) && (
        <p style={{ fontSize: "11px", opacity: 0.35, margin: "0 0 16px", lineHeight: 1.5 }}>
          {hasNegativeBalance && "Saldo daalt onder €0 — overweeg facturen sneller te innen. "}
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
  letterSpacing: "0.08em",
  opacity: 0.25,
  borderBottom: "0.5px solid rgba(0,0,0,0.10)",
};

const tdStyle: React.CSSProperties = {
  padding: "9px 4px",
  fontSize: "13px",
};
