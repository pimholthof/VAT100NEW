"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/context";

// De twee kernen + de waarheid staan altijd in beeld; de overige secties
// leven achter "Meer", zodat ook mobiel alles bereikbaar is.
const navItems = [
  { href: "/dashboard", labelKey: "now" as const, icon: "◉" },
  { href: "/dashboard/invoices", labelKey: "invoices" as const, icon: "□" },
  { href: "/dashboard/tax", labelKey: "tax" as const, icon: "△" },
];

const moreItems = [
  { href: "/dashboard/clients", labelKey: "clients" as const },
  { href: "/dashboard/expenses", labelKey: "expenses" as const },
  { href: "/dashboard/berichten", label: "Berichten" },
  { href: "/dashboard/settings", labelKey: "settings" as const },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useLocale();
  const [moreOpen, setMoreOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const moreActive = moreItems.some((item) => isActive(item.href));

  return (
    <>
      {moreOpen && (
        <div
          className="mobile-more-backdrop"
          onClick={() => setMoreOpen(false)}
          aria-hidden="true"
        />
      )}
      {moreOpen && (
        <div
          id="mobile-more-sheet"
          className="mobile-more-sheet glass"
          role="menu"
          aria-label={t.nav.more}
        >
          {moreItems.map((item) => {
            const active = isActive(item.href);
            const label = "label" in item ? item.label : t.nav[item.labelKey];
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                aria-current={active ? "page" : undefined}
                onClick={() => setMoreOpen(false)}
                className={`mobile-more-sheet-item${active ? " mobile-more-sheet-item--active" : ""}`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}
      <nav className="mobile-bottom-nav" aria-label="Mobiele navigatie">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`mobile-bottom-nav-item${active ? " mobile-bottom-nav-item--active" : ""}`}
            >
              <span aria-hidden="true" className="mobile-bottom-nav-icon">{item.icon}</span>
              <span className="mobile-bottom-nav-label">{t.nav[item.labelKey]}</span>
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-controls="mobile-more-sheet"
          onClick={() => setMoreOpen((v) => !v)}
          className={`mobile-bottom-nav-item${moreActive || moreOpen ? " mobile-bottom-nav-item--active" : ""}`}
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <span aria-hidden="true" className="mobile-bottom-nav-icon">⋯</span>
          <span className="mobile-bottom-nav-label">{t.nav.more}</span>
        </button>
      </nav>
    </>
  );
}
