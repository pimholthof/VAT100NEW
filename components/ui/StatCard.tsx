import React from "react";
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
    <div style={{
      padding: "36px 0 28px",
    }}>
      <p className="label" style={{ margin: "0 0 16px" }}>
        {label}
      </p>
      <p
        className="mono-amount-lg"
        style={{ margin: 0 }}
      >
        {numericValue !== undefined ? (
          <AnimatedNumber value={numericValue} isCurrency={true} />
        ) : (
          value
        )}
      </p>
      {sub && (
        <p
          style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: 11,
            margin: "12px 0 0",
            opacity: 0.3,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div style={{ padding: "36px 0 28px" }}>
      <div className="skeleton" style={{ width: "60%", height: 9, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: "80%", height: 28 }} />
    </div>
  );
}
