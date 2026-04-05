"use client";

import { m as motion } from "framer-motion";
import type { FinancialHealth } from "@/lib/tax/financial-health";

const gradeGlow: Record<string, string> = {
  A: "#1a7a3a",
  B: "#2D5A7B",
  C: "#b45309",
  D: "#C44D2A",
  F: "#A51C30",
};

function factorBarColor(score: number): string {
  if (score >= 70) return "var(--color-success)";
  if (score >= 40) return "var(--color-warning)";
  return "var(--color-overdue)";
}

export function HealthScore({ health }: { health: FinancialHealth }) {
  const glow = gradeGlow[health.grade] ?? "#1a1a19";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{
        padding: "clamp(32px, 5vw, 48px) clamp(28px, 4vw, 40px)",
        border: "0.5px solid rgba(0, 0, 0, 0.08)",
        borderRadius: "var(--radius)",
        background: "var(--dashboard-surface, var(--background))",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Zone 1: Grade Statement ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "clamp(20px, 4vw, 32px)", marginBottom: 28 }}>
        {/* Grade letter with atmospheric glow */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 120,
              height: 120,
              background: glow,
              filter: "blur(80px)",
              opacity: 0.12,
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(72px, 10vw, 104px)",
              fontWeight: 300,
              fontStyle: "italic",
              lineHeight: 0.85,
              letterSpacing: "-0.04em",
              color: "var(--foreground)",
              position: "relative",
            }}
          >
            {health.grade}
          </div>
        </div>

        {/* Score + Summary */}
        <div style={{ paddingTop: "clamp(8px, 1.5vw, 16px)" }}>
          <p
            className="label"
            style={{
              margin: "0 0 6px",
              opacity: 0.35,
              fontSize: 10,
              letterSpacing: "0.12em",
            }}
          >
            {health.score} / 100
          </p>
          <p
            style={{
              fontSize: "clamp(14px, 2vw, 16px)",
              fontWeight: 500,
              margin: 0,
              opacity: 0.55,
              letterSpacing: "-0.01em",
              lineHeight: 1.4,
            }}
          >
            {health.summary}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 40, height: "0.5px", background: "rgba(0, 0, 0, 0.08)", marginBottom: 4 }} />

      {/* ── Zone 2: Factor List ── */}
      <div>
        {health.factors.map((factor, index) => {
          const fill = factorBarColor(factor.score);
          return (
            <motion.div
              key={factor.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.3 + index * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                padding: "14px 0",
                borderTop: "0.5px solid rgba(0, 0, 0, 0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              {/* Left: name + message */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  className="label"
                  style={{
                    margin: "0 0 3px",
                    opacity: 0.35,
                    fontSize: 10,
                    letterSpacing: "0.12em",
                  }}
                >
                  {factor.name}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    margin: 0,
                    opacity: 0.55,
                    lineHeight: 1.4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {factor.message}
                </p>
              </div>

              {/* Right: bar + score */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div
                  style={{
                    width: 80,
                    height: 3,
                    background: "rgba(0, 0, 0, 0.04)",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${factor.score}%` }}
                    transition={{
                      duration: 1.2,
                      delay: 0.5 + index * 0.12,
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
                    opacity: 0.35,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 20,
                    textAlign: "right",
                  }}
                >
                  {factor.score}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
