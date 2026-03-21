import React from "react";

export function ButtonPrimary({
  children,
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`action-button ${className ?? ""}`}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonSecondary({
  children,
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`action-button-secondary ${className ?? ""}`}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      {...props}
    >
      {children}
    </button>
  );
}
