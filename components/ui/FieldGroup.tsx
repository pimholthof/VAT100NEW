import React from "react";

export function FieldGroup({
  label,
  htmlFor,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label
        htmlFor={htmlFor}
        className="label"
        style={{
          display: "block",
          marginBottom: 8,
          opacity: 0.35,
          fontSize: 10,
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
