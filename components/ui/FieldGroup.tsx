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
    <div style={{ marginBottom: 20 }}>
      <label
        htmlFor={htmlFor}
        className="label"
        style={{
          display: "block",
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
