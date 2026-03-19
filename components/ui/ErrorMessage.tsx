import React from "react";

export function ErrorMessage({
  children,
  style,
  id,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  id?: string;
}) {
  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      style={{
        padding: 16,
        marginBottom: 16,
        background: "rgba(13,13,11,0.02)",
        borderLeft: "2px solid var(--color-reserved)",
        fontFamily: "var(--font-mono), monospace",
        fontSize: "11px",
        fontWeight: 400,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
