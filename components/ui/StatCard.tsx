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
    <div style={{ padding: "32px 0" }}>
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-label)",
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          margin: "0 0 8px",
          opacity: 0.4,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "3rem",
          fontWeight: 900,
          lineHeight: 0.9,
          margin: 0,
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "var(--text-mono-sm)",
            fontWeight: 300,
            marginTop: 6,
            marginBottom: 0,
            opacity: 0.35,
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
    <div style={{ padding: "32px 0", opacity: 0.12 }}>
      <div className="skeleton" style={{ width: "60%", height: 9, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: "80%", height: 36 }} />
    </div>
  );
}
