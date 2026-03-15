import React from "react";

export function FieldGroup({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        htmlFor={htmlFor}
        style={{
          display: "block",
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-label)",
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 8,
          opacity: 0.4,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
