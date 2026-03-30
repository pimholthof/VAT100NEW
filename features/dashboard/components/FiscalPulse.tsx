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
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      style={{ 
        padding: "clamp(48px, 8vw, 80px) clamp(32px, 8vw, 100px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        minHeight: 280,
        border: "var(--border-light)",
        borderRadius: "var(--radius)",
        background: "var(--dashboard-surface, var(--background))",
      }}
    >
      <div style={{ flex: 1 }}>
        <p className="label" style={{ marginBottom: 20 }}>Wat je vrij kunt besteden</p>
        <div style={{ position: "relative" }}>
          <AnimatedNumber 
            value={safeToSpend} 
            style={{
              fontSize: "clamp(4rem, 12vw, 10rem)",
              fontWeight: 300,
              lineHeight: 0.85,
              letterSpacing: "-0.03em",
              color: "var(--foreground)"
            }}
          />
          <p className="mono-amount" style={{ 
            position: "absolute", 
            bottom: -48, 
            left: 0, 
            fontSize: "var(--text-label)",
            letterSpacing: "var(--tracking-label)",
            textTransform: "uppercase",
            fontWeight: 500
          }}>
            Vrij te besteden / {formatCurrency(currentBalance)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
