"use client";

import Link from "next/link";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({ icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        textAlign: "center",
      }}
    >
      {icon && (
        <span
          style={{
            fontSize: 32,
            opacity: 0.12,
            marginBottom: 16,
            display: "block",
          }}
        >
          {icon}
        </span>
      )}
      <p
        style={{
          fontSize: "var(--text-body-lg)",
          fontWeight: 500,
          opacity: 0.4,
          margin: 0,
          maxWidth: 320,
          lineHeight: 1.4,
        }}
      >
        {title}
      </p>
      {description && (
        <p
          style={{
            fontSize: "var(--text-body-sm)",
            opacity: 0.25,
            margin: "8px 0 0",
            maxWidth: 280,
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="btn-primary"
          style={{ marginTop: 24 }}
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
