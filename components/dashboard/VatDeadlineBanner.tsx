"use client";

import { formatCurrency } from "@/lib/format";
import type { VatDeadline } from "@/lib/actions/dashboard";

/**
 * VatDeadlineBanner — Shows a prominent countdown to the next BTW deadline.
 * Uses opacity for urgency when fewer than 14 days remaining.
 */
export function VatDeadlineBanner({ deadline }: { deadline: VatDeadline }) {
  const isUrgent = deadline.daysRemaining <= 14;

  return (
    <div
      className="vat-deadline-banner"
      style={{
        padding: 20,
        border: "0.5px solid rgba(13,13,11,0.12)",
        background: "transparent",
        marginBottom: "var(--space-section)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        transition: "opacity 0.15s ease",
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
            color: "var(--foreground)",
            opacity: isUrgent ? 1 : 0.8,
          }}
        >
          {deadline.daysRemaining}d
        </p>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <p className="label" style={{ opacity: 0.5, margin: 0 }}>
            Nu: {formatCurrency(deadline.estimatedAmount)}
          </p>
          {deadline.forecastedAmount && deadline.forecastedAmount > deadline.estimatedAmount && (
            <p className="label" style={{ opacity: 0.3, margin: 0, fontSize: "10px" }}>
              Verwacht: {formatCurrency(deadline.forecastedAmount)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
