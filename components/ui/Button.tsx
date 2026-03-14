import React from "react";

const buttonBaseStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  fontWeight: 500,
  letterSpacing: "0.05em",
  cursor: "pointer",
};

export const buttonPrimaryStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  fontSize: "var(--text-body-lg)",
  padding: "12px 20px",
  border: "none",
  background: "var(--foreground)",
  color: "var(--background)",
};

export const buttonSecondaryStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  fontSize: "var(--text-body-md)",
  padding: "10px 16px",
  border: "1px solid rgba(13, 13, 11, 0.2)",
  background: "transparent",
  color: "var(--foreground)",
};

export function ButtonPrimary({
  children,
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button style={{ ...buttonPrimaryStyle, ...style }} {...props}>
      {children}
    </button>
  );
}

export function ButtonSecondary({
  children,
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button style={{ ...buttonSecondaryStyle, ...style }} {...props}>
      {children}
    </button>
  );
}
