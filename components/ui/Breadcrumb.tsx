"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/context";
import { SEGMENT_LABELS } from "@/lib/navigation";

export function Breadcrumb() {
  const pathname = usePathname();
  const { t } = useLocale();

  const nav = t.nav as Record<string, string>;
  const segments = pathname.split("/").filter(Boolean);

  // Don't show breadcrumbs on dashboard home
  if (segments.length <= 1) return null;

  // Build breadcrumb items (skip "dashboard" as it's always the root)
  const items: { label: string; href: string }[] = [
    { label: t.nav.overview, href: "/dashboard" },
  ];

  let currentPath = "";
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    if (segment === "dashboard") continue;

    // UUID-like segments (detail pages) — show as "..."
    const isUuid = segment.length > 20 && segment.includes("-");
    const labelKey = SEGMENT_LABELS[segment];
    const label = isUuid ? "..." : labelKey ? (nav[labelKey] ?? labelKey) : segment;

    items.push({ label, href: currentPath });
  }

  // Don't render if only "Overzicht"
  if (items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: 16 }}>
      <ol
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          listStyle: "none",
          margin: 0,
          padding: 0,
          fontSize: "var(--text-body-sm)",
          letterSpacing: "0.02em",
        }}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.href} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {index > 0 && (
                <span style={{ opacity: 0.2, fontSize: 10 }}>›</span>
              )}
              {isLast ? (
                <span style={{ opacity: 0.4, fontWeight: 500 }}>{item.label}</span>
              ) : (
                <Link
                  href={item.href}
                  style={{
                    color: "var(--foreground)",
                    textDecoration: "none",
                    opacity: 0.3,
                    transition: "opacity 0.15s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.7"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.3"; }}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
