"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/actions";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/clients", label: "Klanten" },
  { href: "/dashboard/invoices", label: "Facturen" },
  { href: "/dashboard/receipts", label: "Bonnen" },
  { href: "/dashboard/tax", label: "Belasting" },
  { href: "/dashboard/settings", label: "Instellingen" },
];

export function DashboardNav({
  userName,
  studioName,
}: {
  userName: string;
  studioName?: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="dashboard-nav">
      <div className="dashboard-nav-inner">
        {/* Logo */}
        <Link
          href="/dashboard"
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "18px",
            fontWeight: 900,
            letterSpacing: "var(--tracking-display)",
            textDecoration: "none",
            color: "var(--foreground)",
            lineHeight: 1,
          }}
        >
          VAT100
        </Link>

        {/* Desktop nav */}
        <nav className="dashboard-nav-links">
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
                  fontSize: "var(--text-body-md)",
                  fontWeight: 400,
                  letterSpacing: "0.02em",
                  textDecoration: "none",
                  color: "var(--foreground)",
                  opacity: isActive ? 1 : 0.4,
                  transition: "opacity 0.15s ease",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right section: user + logout */}
        <div className="dashboard-nav-right">
          {studioName && (
            <span
              style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "var(--text-body-xs)",
                fontWeight: 400,
                letterSpacing: "0.05em",
                opacity: 0.4,
              }}
            >
              {studioName}
            </span>
          )}
          <form action={logout}>
            <button
              type="submit"
              style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "var(--text-body-xs)",
                fontWeight: 400,
                letterSpacing: "0.02em",
                background: "none",
                border: "none",
                color: "var(--foreground)",
                opacity: 0.4,
                cursor: "pointer",
                padding: 0,
              }}
            >
              Uitloggen
            </button>
          </form>
        </div>

        {/* Mobile hamburger */}
        <button
          className="dashboard-nav-hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <nav className="dashboard-nav-mobile">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "block",
                  fontFamily: "var(--font-body), sans-serif",
                  fontSize: "var(--text-body-md)",
                  fontWeight: 400,
                  letterSpacing: "0.02em",
                  textDecoration: "none",
                  color: "var(--foreground)",
                  opacity: isActive ? 1 : 0.4,
                  padding: "10px 0",
                }}
              >
                {item.label}
              </Link>
            );
          })}
          <form action={logout} style={{ marginTop: 8 }}>
            <button
              type="submit"
              style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "var(--text-body-xs)",
                fontWeight: 400,
                letterSpacing: "0.02em",
                background: "none",
                border: "none",
                color: "var(--foreground)",
                opacity: 0.4,
                cursor: "pointer",
                padding: "10px 0",
              }}
            >
              Uitloggen
            </button>
          </form>
        </nav>
      )}
    </header>
  );
}
