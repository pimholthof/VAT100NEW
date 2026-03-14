import React from "react";

export function ButtonPrimary({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`font-body text-[13px] font-medium tracking-[0.05em] cursor-pointer py-3 px-5 border-0 bg-foreground text-background ${className ?? ""}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonSecondary({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`font-body text-[12px] font-medium tracking-[0.05em] cursor-pointer py-2.5 px-4 border border-foreground/20 bg-transparent text-foreground ${className ?? ""}`}
      {...props}
    >
      {children}
    </button>
  );
}
