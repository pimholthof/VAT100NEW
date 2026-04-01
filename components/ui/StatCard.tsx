import React from "react";
import { m as motion } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";

export function StatCard({
  label,
  value,
  sub,
  numericValue,
  isCurrency = true,
}: {
  label: string;
  value: string | number;
  sub?: string;
  numericValue?: number;
  isCurrency?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 16,
        minHeight: 160,
        border: "0.5px solid rgba(0, 0, 0, 0.08)",
        borderRadius: "var(--radius)",
        background: "var(--card-surface, var(--dashboard-surface, var(--background)))",
        transition: "box-shadow 0.3s ease",
      }}
    >
      <p className="label" style={{ margin: 0, fontSize: 10, letterSpacing: "0.12em" }}>
        {label}
      </p>

      <p
        style={{
          fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)",
          fontWeight: 400,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          margin: 0,
        }}
      >
        {numericValue !== undefined ? (
          <AnimatedNumber value={numericValue} isCurrency={isCurrency} />
        ) : (
          value
        )}
      </p>

      {sub && (
        <div>
          <div style={{ width: 24, height: "0.5px", background: "rgba(0,0,0,0.08)", marginBottom: 8 }} />
          <p
            className="label"
            style={{
              margin: 0,
              opacity: 0.35,
              fontSize: 10,
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
