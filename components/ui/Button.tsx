import React from "react";

export function ButtonPrimary({
  children,
  className,
  style,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={className ?? ""}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      style={{
        fontFamily: "var(--font-body), sans-serif",
        fontSize: "var(--text-label)",
        fontWeight: 500,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        cursor: disabled ? "default" : "pointer",
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
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={className ?? ""}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      style={{
        fontFamily: "var(--font-body), sans-serif",
        fontSize: "var(--text-label)",
        fontWeight: 500,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        cursor: disabled ? "default" : "pointer",
        padding: "14px 28px",
        border: "0.5px solid rgba(13,13,11,0.25)",
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
