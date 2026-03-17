"use client";

import { motion } from "framer-motion";
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
      <div className="glass" style={{ padding: "80px 100px", height: 320, opacity: 0.1 }} />
    );
  }

  const ratio = currentBalance > 0 ? safeToSpend / currentBalance : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="glass tilted-canvas" 
      style={{ 
        padding: "80px 100px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        minHeight: 320
      }}
    >
      <div className="vertical-label">Fiscal Pulse</div>
      
      <div style={{ flex: 1 }}>
        <p className="label" style={{ opacity: 0.2, marginBottom: 20 }}>Net Liquid Wealth</p>
        <div style={{ position: "relative" }}>
          <AnimatedNumber 
            value={safeToSpend} 
            style={{
              fontFamily: "var(--font-geist), sans-serif",
              fontSize: "clamp(4rem, 12vw, 10rem)",
              fontWeight: 400,
              lineHeight: 0.8,
              letterSpacing: "-0.06em",
              color: "var(--foreground)"
            }}
          />
          <p className="mono-amount" style={{ 
            position: "absolute", 
            bottom: -48, 
            left: 0, 
            fontSize: 12, 
            opacity: 0.3,
            letterSpacing: "0.3em",
            textTransform: "uppercase"
          }}>
            Available Assets / {formatCurrency(currentBalance)}
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
          <p className="mono-amount" style={{ fontSize: 10, opacity: 0.2, margin: 0 }}>INDEX</p>
          <p className="display-sm" style={{ margin: 0, fontWeight: 500 }}>{Math.round(ratio * 100)}%</p>
        </div>
      </div>
    </motion.div>
  );
}
