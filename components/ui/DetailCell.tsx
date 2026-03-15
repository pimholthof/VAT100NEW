import React from "react";

export function DetailCell({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div style={{ padding: "24px 0", borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-label)",
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          margin: "0 0 4px",
          opacity: 0.3,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "13px",
          fontWeight: 300,
          margin: 0,
          opacity: value ? 1 : 0.2,
        }}
      >
        {value ?? "\u2014"}
      </p>
    </div>
  );
}
