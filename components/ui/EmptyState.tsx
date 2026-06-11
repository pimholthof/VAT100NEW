"use client";

import Link from "next/link";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  /** Knop-variant van de actie, bv. "wis zoekopdracht"; wint nooit van actionHref. */
  actionOnClick?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  secondaryLabel,
  secondaryHref,
}: EmptyStateProps) {
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
          aria-hidden="true"
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
            opacity: 0.65,
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
      {actionLabel && !actionHref && actionOnClick && (
        <button
          type="button"
          onClick={actionOnClick}
          className="btn-secondary"
          style={{ marginTop: 24 }}
        >
          {actionLabel}
        </button>
      )}
      {secondaryLabel && secondaryHref && (
        <Link
          href={secondaryHref}
          className="empty-state-link"
          style={{ marginTop: 14 }}
        >
          {secondaryLabel}
        </Link>
      )}
    </div>
  );
}
