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
        gap: 20,
        minHeight: 180,
        border: "var(--border-light)",
        borderRadius: "var(--radius)",
        background: "var(--card-surface, var(--dashboard-surface, var(--background)))",
      }}
    >
      <p className="label" style={{ margin: 0 }}>
        {label}
      </p>

      <p
        style={{
          fontSize: "var(--text-display-md)",
          fontWeight: 300,
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
          <div style={{ width: 32, height: "0.5px", background: "rgba(0,0,0,0.08)", marginBottom: 10 }} />
          <p
            className="label"
            style={{
              margin: 0,
              opacity: 0.4,
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
