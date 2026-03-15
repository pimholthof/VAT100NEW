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
    <div style={{ marginBottom: 80 }}>
      {backHref && backLabel && (
        <Link
          href={backHref}
          className="label"
          style={{
            color: "var(--foreground)",
            opacity: 0.3,
            textDecoration: "none",
          }}
        >
          &larr; {backLabel}
        </Link>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginTop: backHref ? 16 : 0,
        }}
      >
        <h1
          className={titleSize === "lg" ? "display-title" : ""}
          style={titleSize === "md" ? {
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-md)",
            fontWeight: 900,
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
