import React from "react";
import { motion } from "framer-motion";

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="glass"
      style={{ 
        padding: "24px", 
        display: "flex", 
        flexDirection: "column", 
        justifyContent: "space-between",
        minHeight: 140,
        borderRadius: "var(--radius-md)",
      }}
    >
      <div>
        <p className="label" style={{ margin: "0 0 4px", opacity: 0.5 }}>
          {label}
        </p>
        <p
          style={{
            fontFamily: "var(--font-geist), sans-serif",
            fontSize: "var(--text-display-md)",
            fontWeight: 500,
            lineHeight: 1.1,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </p>
      </div>
      {sub && (
        <p
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "var(--text-mono-sm)",
            fontWeight: 400,
            marginTop: 12,
            marginBottom: 0,
            opacity: 0.4,
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
