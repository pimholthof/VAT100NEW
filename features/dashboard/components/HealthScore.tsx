"use client";

import type { FinancialHealth } from "@/lib/tax/financial-health";

const gradeColors: Record<string, string> = {
  A: "#16a34a",
  B: "#2563eb",
  C: "#ca8a04",
  D: "#ea580c",
  F: "#dc2626",
};

export function HealthScore({ health }: { health: FinancialHealth }) {
  const color = gradeColors[health.grade] ?? "#000";

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "center", padding: "16px 0" }}>
      <div
        style={{
          fontSize: 36,
          fontWeight: 900,
          lineHeight: 1,
          color,
          fontStyle: "italic",
          minWidth: 44,
          textAlign: "center",
        }}
      >
        {health.grade}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "13px", fontWeight: 500, margin: "0 0 8px" }}>
          {health.summary}
        </p>
        <div style={{ display: "flex", gap: 6 }}>
          {health.factors.map((factor) => (
            <div key={factor.name} style={{ flex: 1 }}>
              <div
                style={{
                  height: 3,
                  background: "rgba(0,0,0,0.06)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${factor.score}%`,
                    height: "100%",
                    background: factor.score >= 70 ? "#16a34a" : factor.score >= 40 ? "#ca8a04" : "#dc2626",
                    borderRadius: 2,
                  }}
                />
              </div>
              <p style={{ fontSize: "9px", opacity: 0.3, margin: "3px 0 0", letterSpacing: "0.04em" }}>
                {factor.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
