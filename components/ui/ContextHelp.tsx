import React from "react";

interface ContextHelpProps {
  term: string;
}

export function ContextHelp({ term }: ContextHelpProps) {
  return (
    <span className="relative inline-block align-middle ml-1 group">
      {/* Trigger: small "?" square */}
      <span
        className="inline-flex items-center justify-center w-4 h-4 cursor-help border-[0.5px] border-[var(--color-border)] rounded-none font-mono text-[9px] leading-none text-[var(--color-muted)] bg-[var(--color-surface)]"
        aria-label={term}
      >
        ?
      </span>

      {/* Tooltip — pure CSS via group-hover */}
      <span
        className="invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute left-0 top-full mt-1 z-50 w-56 p-3 pointer-events-none transition-opacity duration-150 bg-[var(--color-surface)] border-[0.5px] border-[var(--color-border)] shadow-[1px_1px_0px_var(--color-border)] font-[Inter,sans-serif] text-xs leading-normal text-[var(--color-ink)]"
        role="tooltip"
      >
        {term}
      </span>
    </span>
  );
}
