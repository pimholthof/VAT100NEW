import React from "react";
import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Icon placeholder — brutalist square */}
      <div className="flex items-center justify-center w-12 h-12 mb-6 border-[0.5px] border-[var(--color-border)] bg-[var(--color-surface)]">
        <span className="font-mono text-lg text-[var(--color-muted)]">
          —
        </span>
      </div>

      {/* Micro-label */}
      <span className="text-[9px] uppercase tracking-[0.12em] mb-2 text-[var(--color-muted)]">
        Geen gegevens
      </span>

      {/* Title */}
      <h2 className="text-center mb-2 font-[Syne,sans-serif] text-xl font-bold leading-tight text-[var(--color-ink)]">
        {title}
      </h2>

      {/* Description */}
      <p className="text-center max-w-sm mb-6 font-[Inter,sans-serif] text-sm leading-normal text-[var(--color-muted)]">
        {description}
      </p>

      {/* Optional CTA */}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-block no-underline font-mono text-[11px] font-normal tracking-[0.15em] uppercase px-6 py-2.5 border-[0.5px] border-[var(--color-border)] bg-[var(--color-ink)] text-[var(--color-paper)] shadow-[1px_1px_0px_var(--color-border)]"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
