import React from "react";
import { m as motion  } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";

export function StatCard({
  label,
  value,
  sub,
  numericValue,
  isCurrency,
}: {
  label: string;
  value: string | number;
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
        padding: "32px", 
        display: "flex", 
        flexDirection: "column", 
        minHeight: 200,
        position: "relative",
        overflow: "visible",
        border: "var(--border-light)",
        background: "var(--color-grey-light)",
        borderRadius: "var(--radius)",
        alignItems: "center",
        textAlign: "center"
      }}
    >
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", paddingBottom: 24, width: "100%", justifyContent: "center" }}>
        <p className="label" style={{ margin: 0 }}>
          Concept / {label}
        </p>
      </div>

      <div style={{ flex: "0 0 auto", width: "100%" }}>
        <p className="display-title" style={{ fontWeight: 500, letterSpacing: "-0.04em", margin: 0 }}>
          {numericValue !== undefined ? (
            <AnimatedNumber 
              value={numericValue} 
              isCurrency={isCurrency}
            />
          ) : (
            value
          )}
        </p>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", paddingTop: 24, width: "100%", justifyContent: "center" }}>
        {sub ? (
          <p className="label-strong" style={{ letterSpacing: "0.25em", margin: 0 }}>
            {sub}
          </p>
        ) : null}
      </div>
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
