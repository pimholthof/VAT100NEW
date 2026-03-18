"use client";

import { motion } from "framer-motion";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { formatCurrency } from "@/lib/format";

interface FiscalPulseProps {
  safeToSpend: number;
  currentBalance: number;
  isLoading?: boolean;
}

export function FiscalPulse({ safeToSpend, currentBalance, isLoading }: FiscalPulseProps) {
  if (isLoading) {
    return (
      <div style={{ padding: "40px 48px", opacity: 0.1, border: "var(--border-light)" }} />
    );
  }

  const ratio = currentBalance > 0 ? Math.round((safeToSpend / currentBalance) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        padding: "40px 48px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        position: "relative",
        border: "var(--border-light)",
        background: "var(--background)"
      }}
    >
      <p className="label" style={{ opacity: 0.4, margin: 0 }}>Netto Liquiditeit</p>

      <AnimatedNumber
        value={safeToSpend}
        style={{
          fontFamily: `"Helvetica Neue LT Std", "Helvetica Neue", Helvetica, Arial, sans-serif`,
          fontSize: "clamp(2.5rem, 8vw, 6rem)",
          fontWeight: 700,
          lineHeight: 0.9,
          letterSpacing: "-0.04em",
          color: "var(--foreground)"
        }}
      />

      <div style={{
        display: "flex",
        gap: 32,
        alignItems: "baseline",
        borderTop: "var(--border-rule)",
        paddingTop: 16
      }}>
        <span className="mono-amount" style={{ fontSize: 12, opacity: 0.4, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Saldo {formatCurrency(currentBalance)}
        </span>
        <span className="mono-amount" style={{ fontSize: 12, opacity: 0.4, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Ratio {ratio}%
        </span>
      </div>
    </motion.div>
  );
}
