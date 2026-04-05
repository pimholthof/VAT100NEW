"use client";

import type { FinancialHealth } from "@/lib/tax/financial-health";

const gradeColors: Record<string, string> = {
  A: "#16a34a",
  B: "#2563eb",
  C: "#ca8a04",
  D: "#ea580c",
  F: "#dc2626",
};

const gradeBg: Record<string, string> = {
  A: "rgba(22,163,74,0.06)",
  B: "rgba(37,99,235,0.06)",
  C: "rgba(202,138,4,0.06)",
  D: "rgba(234,88,12,0.06)",
  F: "rgba(220,38,38,0.06)",
};

export function HealthScore({ health }: { health: FinancialHealth }) {
  const color = gradeColors[health.grade] ?? "#000";
  const bg = gradeBg[health.grade] ?? "transparent";

  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        alignItems: "center",
        padding: "20px 24px",
        background: bg,
        borderRadius: "var(--radius)",
        border: `0.5px solid ${color}20`,
      }}
    >
      {/* Grade */}
      <div
        style={{
          fontSize: 42,
          fontWeight: 900,
          lineHeight: 1,
          color,
          fontStyle: "italic",
          minWidth: 48,
          textAlign: "center",
        }}
      >
        {health.grade}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px", letterSpacing: "-0.01em" }}>
          {health.summary}
        </p>
        <div style={{ display: "flex", gap: 16 }}>
          {health.factors.map((factor) => {
            const barColor = factor.score >= 70 ? "#16a34a" : factor.score >= 40 ? "#ca8a04" : "#dc2626";
            return (
              <div key={factor.name} style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    height: 6,
                    background: "rgba(0,0,0,0.06)",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${factor.score}%`,
                      height: "100%",
                      background: barColor,
                      borderRadius: 3,
                      transition: "width 0.8s ease",
                    }}
                  />
                </div>
                <p
                  style={{
                    fontSize: "10px",
                    fontWeight: 500,
                    opacity: 0.4,
                    margin: "5px 0 0",
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {factor.name}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
