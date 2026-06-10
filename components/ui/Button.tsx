import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  loading?: boolean;
}

export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: "1.5px solid currentColor",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "vat100-spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

function buttonClass(variant: "primary" | "secondary", extra?: string) {
  const base = variant === "primary" ? "btn-primary" : "btn-secondary";
  return `${base}${extra ? ` ${extra}` : ""}`;
}

function renderContent(loading: boolean | undefined, children: React.ReactNode) {
  if (!loading) return children;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        justifyContent: "center",
      }}
    >
      <Spinner />
      <span style={{ opacity: 0.85 }}>{children}</span>
    </span>
  );
}

export function Button({
  children,
  className,
  variant = "primary",
  loading,
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClass(variant, className ?? undefined)}
      style={style}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-disabled={loading ? true : undefined}
      {...props}
    >
      {renderContent(loading, children)}
    </button>
  );
}

interface LegacyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export function ButtonPrimary({
  children,
  className,
  style,
  loading,
  disabled,
  ...props
}: LegacyButtonProps) {
  return (
    <button
      className={`btn-primary ${className ?? ""}`}
      style={style}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-disabled={loading ? true : undefined}
      {...props}
    >
      {renderContent(loading, children)}
    </button>
  );
}

export function ButtonSecondary({
  children,
  className,
  style,
  loading,
  disabled,
  ...props
}: LegacyButtonProps) {
  return (
    <button
      className={`btn-secondary ${className ?? ""}`}
      style={style}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-disabled={loading ? true : undefined}
      {...props}
    >
      {renderContent(loading, children)}
    </button>
  );
}
