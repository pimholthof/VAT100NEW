"use client";

import { m as motion } from "framer-motion";
import type { FinancialHealth } from "@/lib/tax/financial-health";

function factorBarColor(score: number): string {
  if (score >= 70) return "var(--color-success)";
  if (score >= 40) return "rgba(0, 0, 0, 0.35)";
  return "var(--color-warning)";
}

export function HealthScore({ health }: { health: FinancialHealth }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        padding: "clamp(28px, 4vw, 40px)",
        border: "0.5px solid rgba(0, 0, 0, 0.08)",
        borderRadius: "var(--radius)",
        background: "var(--dashboard-surface, var(--background))",
      }}
    >
      {/* Header: label + score */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 12,
          gap: 16,
        }}
      >
        <p
          className="label"
          style={{
            margin: 0,
            opacity: 0.45,
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          Financiële gezondheid
        </p>
        <span
          style={{
            fontSize: 13,
            fontVariantNumeric: "tabular-nums",
            opacity: 0.45,
            fontWeight: 500,
          }}
          aria-label={`Score ${health.score} van 100`}
        >
          {health.score} <span style={{ opacity: 0.5 }}>/ 100</span>
        </span>
      </div>

      {/* Summary — the real headline */}
      <p
        style={{
          fontSize: "clamp(22px, 3vw, 28px)",
          fontWeight: 400,
          margin: "0 0 28px",
          letterSpacing: "-0.02em",
          lineHeight: 1.25,
          color: "var(--foreground)",
        }}
      >
        {health.summary}
      </p>

      {/* Factor list */}
      <div>
        {health.factors.map((factor, index) => {
          const fill = factorBarColor(factor.score);
          return (
            <motion.div
              key={factor.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.3,
                delay: 0.1 + index * 0.04,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                padding: "16px 0",
                borderTop: "0.5px solid rgba(0, 0, 0, 0.06)",
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                columnGap: 16,
                rowGap: 8,
                alignItems: "center",
              }}
            >
              {/* Row 1 — name + bar */}
              <p
                className="label"
                style={{
                  margin: 0,
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  opacity: 0.55,
                }}
              >
                {factor.name}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 3,
                    background: "rgba(0, 0, 0, 0.05)",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                  aria-hidden="true"
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, factor.score)}%` }}
                    transition={{
                      duration: 0.6,
                      delay: 0.2 + index * 0.05,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    style={{
                      height: "100%",
                      background: fill,
                      borderRadius: 2,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 11,
                    opacity: 0.4,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 22,
                    textAlign: "right",
                  }}
                >
                  {factor.score}
                </span>
              </div>

              {/* Row 2 — message spans both cells */}
              <p
                style={{
                  gridColumn: "1 / -1",
                  fontSize: 13,
                  margin: 0,
                  opacity: 0.7,
                  lineHeight: 1.45,
                  letterSpacing: "-0.005em",
                }}
              >
                {factor.message}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
