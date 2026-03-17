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
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="glass"
      style={{ 
        padding: "24px", 
        display: "flex", 
        flexDirection: "column", 
        justifyContent: "space-between",
        minHeight: 140,
        borderRadius: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle glow effect on hover */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <p className="label-strong" style={{ margin: "0 0 6px" }}>
          {label}
        </p>
        <p
          className="display-hero"
          style={{
            fontSize: "2.5rem",
            fontWeight: 500,
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
      </div>
      {sub && (
        <p
          className="mono-amount"
          style={{
            fontSize: "var(--text-body-xs)",
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
