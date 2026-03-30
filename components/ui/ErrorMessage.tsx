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
        padding: "14px 20px",
        marginBottom: 16,
        background: "rgba(165, 28, 48, 0.04)",
        borderLeft: "2px solid var(--color-accent)",
        borderRadius: "0 8px 8px 0",
        fontSize: 13,
        fontWeight: 400,
        lineHeight: 1.6,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
