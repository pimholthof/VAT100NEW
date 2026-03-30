"use client";

import { m as motion  } from "framer-motion";
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
      <div style={{ padding: "80px 100px", height: 320, opacity: 0.1, border: "var(--border-light)" }} />
    );
  }

  const ratio = currentBalance > 0 ? safeToSpend / currentBalance : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      style={{ 
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 32,
        width: "100%",
      }}
    >
      {/* Box 1: Balance */}
      <div style={{ border: "var(--border-light)", padding: "32px", background: "var(--color-grey-light)", borderRadius: "var(--radius)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minHeight: 220 }}>
        
        <div style={{ flex: 1, display: "flex", alignItems: "flex-end", paddingBottom: 24, width: "100%", justifyContent: "center" }}>
          <p className="label" style={{ margin: 0 }}>
            Vrij besteedbaar
          </p>
        </div>

        <div style={{ flex: "0 0 auto", width: "100%" }}>
          <AnimatedNumber 
            value={safeToSpend} 
            style={{
              fontWeight: 500,
              lineHeight: 0.8,
              letterSpacing: "-0.04em",
              color: "var(--foreground)"
            }}
          />
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "flex-start", paddingTop: 24, width: "100%", justifyContent: "center" }}>
          <p className="label-strong" style={{ letterSpacing: "0.25em", margin: 0 }}>
            Saldo / {formatCurrency(currentBalance)}
          </p>
        </div>
      </div>

      {/* Box 2: Ratio */}
      <div style={{ border: "var(--border-light)", padding: "32px", background: "var(--color-grey-light)", borderRadius: "var(--radius)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minHeight: 220 }}>
        
        <div style={{ flex: 1, display: "flex", alignItems: "flex-end", paddingBottom: 24, width: "100%", justifyContent: "center" }}>
          <p className="label" style={{ margin: 0 }}>Verhouding</p>
        </div>
        
        <div style={{ flex: "0 0 auto", width: "100%" }}>
          <p className="display-hero" style={{ fontWeight: 400, opacity: 0.4, margin: 0 }}>{Math.round(ratio * 100)}%</p>
        </div>

        <div style={{ flex: 1, paddingTop: 24, width: "100%" }}>
          {/* Empty struct to balance the flex: 1 of ratio with the box on the left */}
        </div>
      </div>
    </motion.div>
  );
}
