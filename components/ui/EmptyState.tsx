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
    <div className="flex flex-col items-center justify-center py-20 px-4">
      {/* Brutalist square icon */}
      <div className="flex items-center justify-center w-14 h-14 mb-8 border-2 border-[var(--vat-obsidian)]">
        <span className="font-mono text-xl text-[var(--vat-mid-grey)]">
          —
        </span>
      </div>

      {/* Micro-label */}
      <span className="label mb-3">Geen gegevens</span>

      {/* Title */}
      <h2 className="text-center mb-3 font-[family-name:var(--font-display)] text-[length:var(--text-h2)] font-bold leading-tight text-[var(--foreground)] uppercase">
        {title}
      </h2>

      {/* Description */}
      <p className="text-center max-w-sm mb-8 text-[var(--vat-mid-grey)] leading-relaxed">
        {description}
      </p>

      {/* CTA */}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="action-button no-underline">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
