import React from "react";
import Link from "next/link";

export function PageHeader({
  title,
  backHref,
  backLabel,
  action,
  titleSize = "lg",
}: {
  title: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
  titleSize?: "md" | "lg";
}) {
  const titleClass =
    titleSize === "md"
      ? "font-display text-[2rem] font-black tracking-[0.02em] leading-none m-0"
      : "font-display text-[4rem] font-black tracking-[0.02em] leading-none m-0";

  return (
    <div className="mb-8">
      {backHref && backLabel && (
        <Link
          href={backHref}
          className="font-body text-[11px] font-medium tracking-[0.02em] text-foreground opacity-60 no-underline"
        >
          &larr; {backLabel}
        </Link>
      )}
      <div
        className="flex justify-between items-center"
        style={{ marginTop: backHref ? 16 : 0 }}
      >
        <h1 className={titleClass}>{title}</h1>
        {action}
      </div>
    </div>
  );
}
