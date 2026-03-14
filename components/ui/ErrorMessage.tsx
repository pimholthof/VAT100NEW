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
      style={{
        padding: "12px 16px",
        borderLeft: "2px solid var(--foreground)",
        marginBottom: 16,
        fontFamily: "var(--font-body), sans-serif",
        fontSize: "var(--text-body-md)",
        fontWeight: 400,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
