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
        border: "none",
        borderTop: "var(--border-rule)",
        padding: "24px 0",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.02em",
          margin: "0 0 8px",
          opacity: 0.6,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "2.5rem",
          fontWeight: 900,
          lineHeight: 1,
          margin: 0,
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-sm)",
            fontWeight: 400,
            margin: "8px 0 0",
            opacity: 0.5,
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
    <div
      style={{
        border: "none",
        borderTop: "var(--border-rule)",
        padding: "24px 0",
        opacity: 0.12,
      }}
    >
      <div
        className="skeleton"
        style={{ width: "60%", height: 9, marginBottom: 12 }}
      />
      <div className="skeleton" style={{ width: "80%", height: 32 }} />
    </div>
  );
}
