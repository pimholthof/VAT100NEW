import React from "react";

export function SuccessMessage({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="success-message"
      style={style}
    >
      {children}
    </div>
  );
}
