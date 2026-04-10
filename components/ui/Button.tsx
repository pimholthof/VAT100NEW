import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
}

export function Button({
  children,
  className,
  variant = "primary",
  style,
  ...props
}: ButtonProps) {
  const getButtonClass = () => {
    switch (variant) {
      case "primary":
        return `btn-primary ${className ?? ""}`;
      case "secondary":
        return `btn-secondary ${className ?? ""}`;
      case "outline":
        return `btn-outline ${className ?? ""}`;
      default:
        return `btn-primary ${className ?? ""}`;
    }
  };

  return (
    <button
      className={getButtonClass()}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
}

// Legacy exports for backward compatibility
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
