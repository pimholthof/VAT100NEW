"use client";

import { isBetaMode } from "@/lib/config/features";

interface FiscalDisclaimerProps {
  children: React.ReactNode;
  compact?: boolean;
}

/**
 * Rustige, on-brand disclaimer bij fiscale berekeningen. Maakt expliciet dat
 * cijfers een indicatie zijn en geen belastingadvies — juridisch belangrijk en
 * vertrouwenwekkend. In bèta-modus voegt het automatisch een extra waarschuwing
 * toe.
 */
export function FiscalDisclaimer({ children, compact }: FiscalDisclaimerProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        padding: compact ? "10px 12px" : "12px 14px",
        borderRadius: "var(--radius-sm)",
        background: "rgba(0,0,0,0.025)",
        border: "0.5px solid rgba(0,0,0,0.06)",
        fontSize: 11.5,
        lineHeight: 1.6,
        opacity: 0.8,
      }}
      role="note"
    >
      <span aria-hidden="true" style={{ opacity: 0.5 }}>
        ⓘ
      </span>
      <span>
        {children}
        {isBetaMode() && " VAT100 is in bèta — controleer cijfers extra goed."}
      </span>
    </div>
  );
}
