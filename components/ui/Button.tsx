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
        fontFamily: "var(--font-utility), 'JetBrains Mono', monospace",
        fontSize: "var(--text-label)",
        fontWeight: 400,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        cursor: disabled ? "default" : "pointer",
        padding: "12px 24px",
        border: "none",
        background: disabled
          ? "var(--vat-light-grey)"
          : "var(--vat-obsidian)",
        color: disabled
          ? "var(--vat-mid-grey)"
          : "var(--vat-paper)",
        transition: "background-color 0.2s ease",
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
        fontFamily: "var(--font-utility), 'JetBrains Mono', monospace",
        fontSize: "var(--text-label)",
        fontWeight: 400,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        cursor: disabled ? "default" : "pointer",
        padding: "10px 22px",
        border: "2px solid var(--vat-obsidian)",
        background: "transparent",
        color: "var(--vat-obsidian)",
        transition: "background-color 0.2s ease, color 0.2s ease",
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
