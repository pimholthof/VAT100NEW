import React from "react";
import { m as motion } from "framer-motion";
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        padding: "28px 32px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 160,
        position: "relative",
        overflow: "visible",
        border: "0.5px solid rgba(0,0,0,0.06)",
        background: "var(--background)",
        transition: "border-color 0.3s ease",
      }}
    >
      <div style={{ position: "relative", zIndex: 1 }}>
        <p className="label" style={{ margin: "0 0 16px", opacity: 0.35 }}>
          {label}
        </p>
        <p
          style={{
            fontSize: "var(--text-display-md)",
            fontWeight: 500,
            lineHeight: 0.9,
            margin: 0,
            letterSpacing: "-0.02em",
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
        <div style={{ marginTop: 20 }}>
          <div style={{ width: 32, height: 0.5, background: "rgba(0,0,0,0.08)", marginBottom: 10 }} />
          <p
            className="label"
            style={{
              margin: 0,
              opacity: 0.3,
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
    <div style={{ padding: "28px 32px", minHeight: 160 }}>
      <div className="skeleton" style={{ width: "40%", height: 10, marginBottom: 20 }} />
      <div className="skeleton" style={{ width: "70%", height: 28 }} />
    </div>
  );
}
