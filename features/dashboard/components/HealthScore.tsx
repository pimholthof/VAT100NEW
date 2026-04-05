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
    <div
      style={{
        display: "flex",
        gap: 24,
        alignItems: "flex-start",
        padding: "24px 0",
      }}
    >
      {/* Grade */}
      <div
        style={{
          fontSize: 48,
          fontWeight: 900,
          lineHeight: 1,
          color,
          fontStyle: "italic",
          minWidth: 56,
          textAlign: "center",
        }}
      >
        {health.grade}
      </div>

      {/* Factors */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        {health.factors.map((factor) => (
          <div key={factor.name}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}
              >
                {factor.name}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontFamily: "var(--font-geist-mono)",
                  opacity: 0.4,
                }}
              >
                {factor.score}
              </span>
            </div>
            <div
              style={{
                width: "100%",
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
                  transition: "width 0.6s ease",
                }}
              />
            </div>
            <p
              style={{
                fontSize: "11px",
                opacity: 0.4,
                margin: "3px 0 0",
                lineHeight: 1.4,
              }}
            >
              {factor.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
