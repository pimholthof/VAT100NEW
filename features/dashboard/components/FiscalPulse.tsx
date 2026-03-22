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
        padding: "80px 100px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        minHeight: 320,
        border: "var(--border-light)",
        background: "var(--background)"
      }}
    >
      <div className="vertical-label">Fiscale Index</div>
      
      <div style={{ flex: 1 }}>
        <p className="label" style={{ marginBottom: 20 }}>Netto Liquiditeit</p>
        <div style={{ position: "relative" }}>
          <AnimatedNumber 
            value={safeToSpend} 
            style={{
              
              fontSize: "clamp(4rem, 12vw, 10rem)",
              fontWeight: 500,
              lineHeight: 0.8,
              letterSpacing: "-0.02em",
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
            Beschikbaar Kapitaal / {formatCurrency(currentBalance)}
          </p>
        </div>
      </div>

      <div style={{ marginLeft: 80, position: "relative" }}>
        <SafeToSpendRing 
          percentage={ratio} 
          size={240}
          strokeWidth={2}
        />
        {/* Subtle center marker for Rams-inspired clarity */}
        <div style={{ 
          position: "absolute", 
          top: "50%", 
          left: "50%", 
          transform: "translate(-50%, -50%)",
          textAlign: "center"
        }}>
          <p className="label" style={{ margin: 0, opacity: 0.4 }}>Ratio</p>
          <p className="display-hero" style={{ fontSize: "2.8rem", margin: "4px 0 0" }}>{Math.round(ratio * 100)}%</p>
        </div>
      </div>
    </motion.div>
  );
}
