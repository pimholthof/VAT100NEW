import React from "react";

export function DetailCell({
  label,
  value,
  labelWeight = 500,
}: {
  label: string;
  value: string | null;
  labelWeight?: number;
}) {
  return (
    <div className="py-5 border-b border-b-foreground/15">
      <p
        className="font-body text-[10px] tracking-[0.02em] m-0 mb-1 opacity-60"
        style={{ fontWeight: labelWeight }}
      >
        {label}
      </p>
      <p className="font-body text-[13px] font-light m-0">
        {value ?? "\u2014"}
      </p>
    </div>
  );
}
