import React from "react";

export function ErrorMessage({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="py-3 px-4 border-l-2 border-l-foreground mb-4 font-body text-[12px] font-normal"
      style={style}
    >
      {children}
    </div>
  );
}
