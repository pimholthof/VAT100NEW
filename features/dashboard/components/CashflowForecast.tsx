"use client";

import type { CashflowForecastWeek } from "@/features/dashboard/actions";
import { formatCurrency } from "@/lib/format";

export function CashflowForecast({
  weeks,
}: {
  weeks: CashflowForecastWeek[];
}) {
  if (!weeks || weeks.length === 0) return null;

  const hasNegativeBalance = weeks.some((w) => w.runningBalance < 0);

  return (
    <div>
      <h2 className="brutalist-section-title">
        <span>Cashflow Forecast</span>
        <span className="brutalist-rule" />
      </h2>

      <div
        style={{
          overflowX: "auto",
          marginBottom: 24,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "var(--text-body-sm)",
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>Week</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Verwacht in</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Geschatte uit</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Saldo</th>
              <th style={thStyle}>Events</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, i) => {
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
                    background: isCurrentWeek
                      ? "rgba(0,0,0,0.02)"
                      : isNegative
                        ? "rgba(220,38,38,0.04)"
                        : "transparent",
                  }}
                >
                  <td style={{ ...tdStyle, fontWeight: isCurrentWeek ? 600 : 400 }}>
                    {isCurrentWeek ? "Nu" : label}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--font-geist-mono)" }}>
                    {week.expectedIncome > 0 ? formatCurrency(week.expectedIncome) : "—"}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontFamily: "var(--font-geist-mono)",
                      opacity: 0.4,
                    }}
                  >
                    {formatCurrency(week.expectedExpenses)}
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
                  <td style={{ ...tdStyle, fontSize: "11px", opacity: 0.5 }}>
                    {week.events.join(" · ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasNegativeBalance && (
        <p
          style={{
            fontSize: "var(--text-body-xs)",
            color: "#DC2626",
            fontWeight: 500,
            margin: "0 0 24px",
          }}
        >
          Let op: je saldo daalt onder €0 binnen de komende 90 dagen. Overweeg facturen sneller te innen of uitgaven uit te stellen.
        </p>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 8px",
  textAlign: "left",
  fontSize: "10px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  opacity: 0.3,
  borderBottom: "0.5px solid rgba(0,0,0,0.12)",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 8px",
};
