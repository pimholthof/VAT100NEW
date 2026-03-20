import React from "react";

export function SuccessMessage({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`success-message ${className ?? ""}`}
      style={style}
    >
      {children}
    </div>
  );
}
