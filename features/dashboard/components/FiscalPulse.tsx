"use client";

import { m as motion } from "framer-motion";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { SafeToSpendRing } from "./SafeToSpendRing";
import { formatCurrency } from "@/lib/format";

interface FiscalPulseProps {
  safeToSpend: number;
  currentBalance: number;
  isLoading?: boolean;
}

export function FiscalPulse({ safeToSpend, currentBalance, isLoading }: FiscalPulseProps) {
  if (isLoading) {
    return (
      <div style={{ padding: "48px", height: 280, border: "0.5px solid rgba(0,0,0,0.06)" }}>
        <div className="skeleton" style={{ width: "30%", height: 10, marginBottom: 24 }} />
        <div className="skeleton" style={{ width: "60%", height: 48 }} />
      </div>
    );
  }

  const ratio = currentBalance > 0 ? safeToSpend / currentBalance : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{
        padding: "clamp(32px, 6vw, 80px) clamp(24px, 5vw, 80px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "clamp(24px, 4vw, 80px)",
        position: "relative",
        minHeight: 240,
        border: "0.5px solid rgba(0,0,0,0.06)",
        background: "var(--background)",
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: 200 }}>
        <p className="label" style={{ marginBottom: 20, opacity: 0.3 }}>Netto Liquiditeit</p>
        <div>
          <AnimatedNumber
            value={safeToSpend}
            style={{
              fontSize: "clamp(3rem, 10vw, 8rem)",
              fontWeight: 500,
              lineHeight: 0.85,
              letterSpacing: "-0.03em",
              color: "var(--foreground)",
            }}
          />
          <p className="label" style={{
            marginTop: 16,
            opacity: 0.25,
          }}>
            Beschikbaar / {formatCurrency(currentBalance)} saldo
          </p>
        </div>
      </div>

      <div style={{ position: "relative", flexShrink: 0 }}>
        <SafeToSpendRing
          percentage={ratio}
          size={180}
          strokeWidth={1.5}
        />
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}>
          <p className="label" style={{ margin: 0, opacity: 0.3 }}>Ratio</p>
          <p style={{
            fontSize: "2.2rem",
            fontWeight: 600,
            margin: "4px 0 0",
            letterSpacing: "-0.02em",
          }}>{Math.round(ratio * 100)}%</p>
        </div>
      </div>
    </motion.div>
  );
}
