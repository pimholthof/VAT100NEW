import React from "react";

export function ErrorMessage({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        padding: "12px 16px",
        marginBottom: 16,
        background: "rgba(165, 28, 48, 0.04)",
        borderLeft: "2px solid var(--color-accent)",
        fontSize: "12px",
        fontWeight: 400,
        lineHeight: 1.5,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
