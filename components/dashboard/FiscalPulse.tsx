"use client";

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
      <div style={{ padding: "var(--space-section) 0" }}>
        <div className="skeleton" style={{ width: "40%", height: 9, marginBottom: 24 }} />
        <div className="skeleton" style={{ width: "70%", height: 64 }} />
      </div>
    );
  }

  return (
    <div style={{
      padding: "var(--space-section) 0",
      borderBottom: "var(--border-rule)",
    }}>
      <p className="label" style={{ marginBottom: 20 }}>
        Netto Liquiditeit
      </p>
      <AnimatedNumber
        value={safeToSpend}
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: "clamp(3rem, 8vw, 6rem)",
          fontWeight: 300,
          lineHeight: 0.85,
          fontVariantNumeric: "tabular-nums",
          color: "var(--foreground)",
        }}
      />
      <p className="label" style={{
        marginTop: 24,
        opacity: 0.3,
      }}>
        Beschikbaar / Saldo {formatCurrency(currentBalance)}
      </p>
    </div>
  );
}
