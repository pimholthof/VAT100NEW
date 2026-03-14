import React from "react";
import Link from "next/link";

const backLinkStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-body-sm)",
  fontWeight: 500,
  letterSpacing: "0.02em",
  color: "var(--foreground)",
  opacity: 0.6,
  textDecoration: "none",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--font-display), sans-serif",
  fontSize: "var(--text-display-lg)",
  fontWeight: 900,
  letterSpacing: "var(--tracking-display)",
  lineHeight: 1,
  margin: 0,
};

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
  const fontSize =
    titleSize === "md" ? "var(--text-display-md)" : "var(--text-display-lg)";

  return (
    <div style={{ marginBottom: 32 }}>
      {backHref && backLabel && (
        <Link href={backHref} style={backLinkStyle}>
          ← {backLabel}
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
        <h1 style={{ ...titleStyle, fontSize }}>{title}</h1>
        {action}
      </div>
    </div>
  );
}
