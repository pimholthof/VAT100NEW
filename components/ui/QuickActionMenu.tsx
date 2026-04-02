"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";

export function QuickActionMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useLocale();

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const actions = [
    { href: "/dashboard/invoices/new", label: t.nav.invoices },
    { href: "/dashboard/quotes/new", label: "Offerte" },
    { href: "/dashboard/clients/new", label: t.nav.clients },
    { href: "/dashboard/receipts/new", label: "Bon" },
  ];

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
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 180,
            background: "var(--background)",
            border: "0.5px solid rgba(0,0,0,0.08)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
            padding: "6px 0",
            zIndex: 100,
          }}
        >
          <div
            style={{
              padding: "8px 16px 6px",
              fontSize: "var(--text-label)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              opacity: 0.3,
              fontWeight: 600,
            }}
          >
            {t.common.new}
          </div>
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                padding: "10px 16px",
                fontSize: "var(--text-body-md)",
                color: "var(--foreground)",
                textDecoration: "none",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.03)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
