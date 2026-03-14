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
    <div style={{ marginBottom: 64 }}>
      {backHref && backLabel && (
        <Link
          href={backHref}
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-label)",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
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
          alignItems: "center",
          marginTop: backHref ? 16 : 0,
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: titleSize === "md" ? "var(--text-display-md)" : "var(--text-display-lg)",
            fontWeight: 900,
            letterSpacing: "var(--tracking-display)",
            lineHeight: 0.9,
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
