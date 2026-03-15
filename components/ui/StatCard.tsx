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
    <div style={{ padding: "36px 0 28px" }}>
      <p className="label" style={{ margin: "0 0 12px" }}>
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: "var(--text-mono-lg)",
          fontWeight: 300,
          lineHeight: 1,
          margin: 0,
          fontVariantNumeric: "tabular-nums",
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
            marginTop: 8,
            marginBottom: 0,
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
    <div style={{ padding: "36px 0 28px", opacity: 0.12 }}>
      <div className="skeleton" style={{ width: "60%", height: 9, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: "80%", height: 28 }} />
    </div>
  );
}
