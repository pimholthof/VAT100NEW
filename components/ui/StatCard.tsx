import React from "react";

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
    <div
      style={{
        padding: "24px 28px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 16,
        minHeight: 140,
        border: "var(--border-light)",
        background: "var(--color-surface)",
      }}
    >
      <p className="label" style={{ margin: 0, opacity: 0.4 }}>
        {label}
      </p>

      <p
        className="mono-amount"
        style={{
          fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
          fontWeight: 500,
          lineHeight: 1,
          margin: 0,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
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
            paddingTop: 12,
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
    <div style={{ padding: "36px 0 28px", opacity: 0.12 }}>
      <div className="skeleton" style={{ width: "60%", height: 9, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: "80%", height: 28 }} />
    </div>
  );
}
