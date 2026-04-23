"use client";

import React from "react";
import { m as motion } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";

export function StatCard({
  label,
  value,
  sub,
  hint,
  numericValue,
  isCurrency = true,
  compact = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  hint?: string;
  numericValue?: number;
  isCurrency?: boolean;
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`stat-card ${compact ? "stat-card--compact" : ""}`}
    >
      <p className="label" style={{ margin: 0, fontSize: 10, letterSpacing: "0.12em" }}>
        {label}
      </p>

      <p className="stat-card__value">
        {numericValue !== undefined ? (
          <AnimatedNumber value={numericValue} isCurrency={isCurrency} />
        ) : (
          value
        )}
      </p>

      {(sub || hint) && (
        <div>
          <div className="stat-card__rule" />
          {sub && (
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
          )}
          {hint && (
            <p
              style={{
                margin: sub ? "2px 0 0" : 0,
                opacity: 0.45,
                fontSize: 11,
                lineHeight: 1.4,
                fontStyle: "italic",
              }}
            >
              {hint}
            </p>
          )}
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
