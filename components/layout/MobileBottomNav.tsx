"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/context";

const navItems = [
  { href: "/dashboard", labelKey: "overview" as const, icon: "◉" },
  { href: "/dashboard/invoices", labelKey: "invoices" as const, icon: "□" },
  { href: "/dashboard/expenses", labelKey: "expenses" as const, icon: "◇" },
  { href: "/dashboard/clients", labelKey: "clients" as const, icon: "○" },
  { href: "/dashboard/tax", labelKey: "tax" as const, icon: "△" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
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
    </nav>
  );
}
