import React from "react";

export function FieldGroup({
  label,
  children,
  variant = "default",
}: {
  label: string;
  children: React.ReactNode;
  variant?: "default" | "caps";
}) {
  const isCapital = variant === "caps";
  const labelClass = isCapital
    ? "block font-body text-[9px] font-medium tracking-[0.25em] uppercase mb-1.5"
    : "block font-body text-[10px] font-medium tracking-[0.02em] mb-1.5";

  return (
    <div className="mb-4">
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}
