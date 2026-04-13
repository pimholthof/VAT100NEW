"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";
import { useClickOutside } from "@/hooks/useClickOutside";
import { QUICK_ACTIONS } from "@/lib/navigation";

export function QuickActionMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useLocale();
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);

  const nav = t.nav as Record<string, string>;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={t.common.new}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          fontSize: 18,
          fontWeight: 300,
          lineHeight: 1,
          background: "transparent",
          border: "0.5px solid rgba(0,0,0,0.12)",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
          color: "var(--foreground)",
          transition: "opacity 0.2s ease",
          opacity: open ? 1 : 0.5,
        }}
      >
        +
      </button>

      {open && (
        <div role="menu" className="dropdown-menu dropdown-menu--right" style={{ zIndex: 100 }}>
          <div className="dropdown-menu__label">
            {t.common.new}
          </div>
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="dropdown-item--link"
            >
              {nav[action.labelKey] ?? action.labelKey}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
