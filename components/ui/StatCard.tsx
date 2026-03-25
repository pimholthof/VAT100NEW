import React from "react";
import { m as motion  } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";

export function StatCard({
  label,
  value,
  sub,
  numericValue,
  isCurrency = true,
}: {
  label: string;
  value: string;
  sub?: string;
  numericValue?: number;
  isCurrency?: boolean;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{ 
        padding: "28px", 
        display: "flex", 
        flexDirection: "column", 
        justifyContent: "space-between",
        gap: 24,
        minHeight: 200,
        position: "relative",
        overflow: "visible", // To allow vertical label to bleed out if needed
        border: "var(--border-light)",
        background: "var(--card-surface, var(--dashboard-surface, var(--background)))",
        borderRadius: "var(--card-radius, var(--dashboard-surface-radius, 0px))"
      }}
    >
      <div className="vertical-label">{label}</div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <p className="label" style={{ margin: "0 0 12px" }}>
          Concept / {label}
        </p>
        <p
          className="display-hero"
          style={{
            fontSize: "var(--text-display-md)",
            fontWeight: 500,
            lineHeight: 0.9,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          {numericValue !== undefined ? (
            <AnimatedNumber value={numericValue} isCurrency={isCurrency} />
          ) : (
            value
          )}
        </p>
      </div>

      {sub && (
        <div style={{ marginTop: "auto" }}>
          <div style={{ width: 40, height: 1, background: "rgba(0,0,0,0.05)", marginBottom: 12 }} />
          <p
            className="mono-amount"
            style={{
              fontSize: "var(--text-label)",
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-label)",
              fontWeight: 500
            }}
          >
            {sub}
          </p>
        </div>
      )}
    </motion.div>
  );
}

export function SkeletonCard() {
  return (
    <div style={{ padding: "36px 0 28px", opacity: 0.12 }}>
      <div className="skeleton" style={{ width: "60%", height: 9, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: "80%", height: 28 }} />
    </div>
  );
}
