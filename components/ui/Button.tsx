import React from "react";

export function ButtonPrimary({
  children,
  className,
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`btn-primary ${className ?? ""}`}
      style={style}
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
      className={`btn-secondary ${className ?? ""}`}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
}
