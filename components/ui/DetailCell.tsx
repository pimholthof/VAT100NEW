import React from "react";

export function DetailCell({
  label,
  value,
  labelWeight = 500,
}: {
  label: string;
  value: string | null;
  labelWeight?: number;
}) {
  return (
    <div style={{ padding: "20px 0", borderBottom: "var(--border-rule)" }}>
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "10px",
          fontWeight: labelWeight,
          letterSpacing: "0.02em",
          margin: "0 0 4px",
          opacity: 0.6,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-lg)",
          fontWeight: 300,
          margin: 0,
        }}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}
