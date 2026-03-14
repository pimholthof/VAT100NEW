import React from "react";

export function FieldGroup({
  label,
  children,
  variant = "default",
}: {
  label: string;
  children: React.ReactNode;
  variant?: "default" | "caps";
}) {
  const isCapital = variant === "caps";
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontFamily: "var(--font-body), sans-serif",
          fontSize: isCapital ? "9px" : "10px",
          fontWeight: 500,
          letterSpacing: isCapital ? "0.25em" : "0.02em",
          textTransform: isCapital ? "uppercase" : undefined,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
