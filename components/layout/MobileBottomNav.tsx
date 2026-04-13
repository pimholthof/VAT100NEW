"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/context";
import { NAV_ITEMS } from "@/lib/navigation";

const mobileItems = NAV_ITEMS.filter((i) => i.group === "main" && i.icon);

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const nav = t.nav as Record<string, string>;

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobiele navigatie">
      {mobileItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-bottom-nav-item${active ? " mobile-bottom-nav-item--active" : ""}`}
          >
            <span className="mobile-bottom-nav-icon">{item.icon}</span>
            <span className="mobile-bottom-nav-label">{nav[item.labelKey] ?? item.labelKey}</span>
          </Link>
        );
      })}
    </nav>
  );
}
