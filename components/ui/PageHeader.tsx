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
  return (
    <div className="page-header">
      {backHref && backLabel && (
        <Link href={backHref} className="page-header-back">
          &larr; {backLabel}
        </Link>
      )}
      <div className="page-header-row" style={{ marginTop: backHref ? 16 : 0 }}>
        <h1
          className={titleSize === "lg" ? "display-title" : ""}
          style={titleSize === "md" ? {
            fontFamily: "'Syne', sans-serif",
            fontSize: "var(--text-display-md)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-display)",
            lineHeight: 0.9,
            margin: 0,
          } : {
            margin: 0,
          }}
        >
          {title}
        </h1>
        {action}
      </div>
    </div>
  );
}
