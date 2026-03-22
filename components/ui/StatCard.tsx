import React from "react";
import { m as motion  } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";

export function StatCard({
  label,
  value,
  sub,
  numericValue,
}: {
  label: string;
  value: string;
  sub?: string;
  numericValue?: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{ 
        padding: "32px", 
        display: "flex", 
        flexDirection: "column", 
        justifyContent: "space-between",
        minHeight: 180,
        position: "relative",
        overflow: "visible", // To allow vertical label to bleed out if needed
        border: "var(--border-light)",
        background: "var(--background)"
      }}
    >
      <div className="vertical-label">{label}</div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <p className="label" style={{ margin: "0 0 12px", opacity: 0.2 }}>
          Concept / {label}
        </p>
        <p
          className="display-hero"
          style={{
            fontSize: "3.5rem",
            fontWeight: 400,
            lineHeight: 0.9,
            margin: 0,
            letterSpacing: "-0.05em",
          }}
        >
          {numericValue !== undefined ? (
            <AnimatedNumber value={numericValue} isCurrency={true} />
          ) : (
            value
          )}
        </p>
      </div>

      {sub && (
        <div style={{ marginTop: 24 }}>
          <div style={{ width: 40, height: 1, background: "rgba(0,0,0,0.05)", marginBottom: 12 }} />
          <p
            className="mono-amount"
            style={{
              fontSize: "10px",
              margin: 0,
              opacity: 0.3,
              textTransform: "uppercase",
              letterSpacing: "0.1em"
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
