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
        padding: 16,
        marginBottom: 16,
        background: "rgba(13,13,11,0.02)",
        fontSize: "11px",
        fontWeight: 400,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
