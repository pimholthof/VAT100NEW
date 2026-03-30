"use client";

import { m as motion  } from "framer-motion";
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
      <div style={{ padding: "80px 100px", height: 320, opacity: 0.1, border: "var(--border-light)", borderRadius: "var(--radius)" }} />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{
        padding: "clamp(36px, 6vw, 56px) clamp(28px, 5vw, 48px)",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        position: "relative",
        border: "0.5px solid rgba(0, 0, 0, 0.08)",
        borderRadius: "var(--radius)",
        background: "var(--dashboard-surface, var(--background))",
      }}
    >
      <p className="label" style={{ margin: 0, fontSize: 10, letterSpacing: "0.12em" }}>Wat je vrij kunt besteden</p>
      <AnimatedNumber
        value={safeToSpend}
        style={{
          fontSize: "clamp(3rem, 8vw, 6rem)",
          fontWeight: 300,
          lineHeight: 0.9,
          letterSpacing: "-0.03em",
          color: "var(--foreground)"
        }}
      />
      <div style={{ width: 32, height: "0.5px", background: "rgba(0,0,0,0.08)" }} />
      <p className="label" style={{
        margin: 0,
        fontSize: 10,
        letterSpacing: "0.12em",
        opacity: 0.4,
      }}>
        Saldo {formatCurrency(currentBalance)}
      </p>
    </motion.div>
  );
}
