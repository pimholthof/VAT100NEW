import React from "react";

export function DetailCell({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div style={{ padding: "20px 0", borderBottom: "0.5px solid rgba(0,0,0,0.04)" }}>
      <p
        className="label"
        style={{
          margin: "0 0 6px",
          opacity: 0.3,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: "13px",
          fontWeight: 400,
          margin: 0,
          opacity: value ? 1 : 0.15,
        }}
      >
        {value ?? "\u2014"}
      </p>
    </div>
  );
}
