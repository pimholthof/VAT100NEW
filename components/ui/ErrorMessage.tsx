import React from "react";

export function ErrorMessage({
  children,
  style,
  className,
  id,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      className={`p-4 mb-4 bg-foreground/[0.02] border-l-2 border-[var(--color-reserved)] font-mono text-[11px] font-normal ${className ?? ""}`}
      style={style}
    >
      {children}
    </div>
  );
}
