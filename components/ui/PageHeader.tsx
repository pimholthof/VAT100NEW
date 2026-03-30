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
    <div style={{ marginBottom: "var(--space-xl, 40px)" }}>
      {backHref && backLabel && (
        <Link
          href={backHref}
          className="label"
          style={{
            color: "var(--foreground)",
            opacity: 0.3,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 20,
            fontSize: 11,
            transition: "opacity 0.15s ease",
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
          gap: 16,
        }}
      >
        <h1
          className={titleSize === "lg" ? "display-title" : ""}
          style={titleSize === "md" ? {
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1,
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
