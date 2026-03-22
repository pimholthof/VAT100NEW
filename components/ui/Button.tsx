import React from "react";

export function ButtonPrimary({
  children,
  className,
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={className ?? ""}
      style={{
        fontFamily: "var(--font-body), sans-serif",
        fontSize: "var(--text-label)",
        fontWeight: 500,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        cursor: "pointer",
        padding: "16px 32px",
        border: "none",
        background: "var(--foreground)",
        color: "var(--background)",
        transition: "opacity 0.15s ease",
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonSecondary({
  children,
  className,
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={className ?? ""}
      style={{
        fontFamily: "var(--font-geist), sans-serif",
        fontSize: "var(--text-label)",
        fontWeight: 500,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        cursor: "pointer",
        padding: "14px 28px",
        border: "var(--border-light)",
        background: "transparent",
        color: "var(--foreground)",
        transition: "all 0.2s ease",
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
