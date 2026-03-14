"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/actions";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/invoices", label: "Facturen" },
];

export function DashboardNav({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 32px",
        borderBottom: "var(--border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <Link
          href="/dashboard"
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "1.25rem",
            fontWeight: 900,
            letterSpacing: "var(--tracking-display)",
            textDecoration: "none",
            color: "var(--foreground)",
          }}
        >
          VAT100
        </Link>
        <div style={{ display: "flex", gap: 24 }}>
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  fontFamily: "var(--font-body), sans-serif",
                  fontSize: "var(--text-body-lg)",
                  fontWeight: isActive ? 500 : 300,
                  textDecoration: "none",
                  color: "var(--foreground)",
                  opacity: isActive ? 1 : 0.6,
                  textTransform: "uppercase",
                  letterSpacing: "var(--tracking-caps)",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-sm)",
            fontWeight: 300,
            opacity: 0.6,
          }}
        >
          {userName}
        </span>
        <form action={logout}>
          <button
            type="submit"
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "var(--text-body-xs)",
              fontWeight: 500,
              letterSpacing: "var(--tracking-caps)",
              textTransform: "uppercase",
              padding: "8px 12px",
              border: "1px solid var(--foreground)",
              background: "transparent",
              color: "var(--foreground)",
              cursor: "pointer",
            }}
          >
            Uitloggen
          </button>
        </form>
      </div>
    </nav>
  );
}
