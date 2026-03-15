"use client";

import { formatCurrency } from "@/lib/format";
import type { VatDeadline } from "@/lib/actions/dashboard";

/**
 * VatDeadlineBanner — Shows a prominent countdown to the next BTW deadline.
 * Turns urgent (red accent) when fewer than 14 days remaining.
 */
export function VatDeadlineBanner({ deadline }: { deadline: VatDeadline }) {
  const isUrgent = deadline.daysRemaining <= 14;

  return (
    <div
      className="vat-deadline-banner"
      style={{
        padding: 20,
        border: isUrgent
          ? "1px solid rgba(180,60,60,0.2)"
          : "1px solid rgba(13,13,11,0.08)",
        background: isUrgent ? "rgba(180,60,60,0.02)" : "transparent",
        marginBottom: "var(--space-section)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        transition: "all 0.3s ease",
      }}
    >
      <div>
        <p className="label" style={{ opacity: 0.5, margin: "0 0 4px" }}>
          Volgende BTW-aangifte
        </p>
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-lg)",
            fontWeight: 500,
            margin: 0,
          }}
        >
          {deadline.quarter} — uiterlijk {deadline.deadline}
        </p>
      </div>
      <div style={{ textAlign: "right" }}>
        <p
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-md)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-display)",
            margin: "0 0 2px",
            color: isUrgent ? "#b43c3c" : "var(--foreground)",
          }}
        >
          {deadline.daysRemaining}d
        </p>
        <p className="label" style={{ opacity: 0.5, margin: 0 }}>
          ~{formatCurrency(deadline.estimatedAmount)}
        </p>
      </div>
    </div>
  );
}
