import React from "react";
import { motion } from "framer-motion";
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
        padding: "24px 28px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 16,
        minHeight: 140,
        position: "relative",
        overflow: "hidden",
        border: "var(--border-light)",
        background: "var(--background)"
      }}
    >
      <p className="label" style={{ margin: 0, opacity: 0.4 }}>
        {label}
      </p>

      <p
        style={{
          fontFamily: `"Helvetica Neue LT Std", "Helvetica Neue", Helvetica, Arial, sans-serif`,
          fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
          fontWeight: 700,
          lineHeight: 1,
          margin: 0,
          letterSpacing: "-0.03em",
        }}
      >
        {numericValue !== undefined ? (
          <AnimatedNumber value={numericValue} isCurrency={true} />
        ) : (
          value
        )}
      </p>

      {sub && (
        <p
          className="mono-amount"
          style={{
            fontSize: 10,
            margin: 0,
            opacity: 0.35,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            borderTop: "var(--border-rule)",
            paddingTop: 12
          }}
        >
          {sub}
        </p>
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
