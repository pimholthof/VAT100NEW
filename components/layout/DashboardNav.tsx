"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/clients", label: "Klanten" },
  { href: "/dashboard/invoices", label: "Facturen" },
  { href: "/dashboard/receipts", label: "Bonnen" },
  { href: "/dashboard/bank", label: "Bank" },
  { href: "/dashboard/tax", label: "Belasting" },
  { href: "/dashboard/settings", label: "Instellingen" },
];

export function DashboardNav({
  studioName,
}: {
  userName: string;
  studioName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

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
            letterSpacing: "0.20em",
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
                  fontSize: "var(--text-label)",
                  fontWeight: 500,
                  letterSpacing: "var(--tracking-label)",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  color: "var(--foreground)",
                  opacity: isActive ? 1 : 0.2,
                  transition: "opacity 0.15s ease",
                  paddingBottom: 2,
                  borderBottom: isActive
                    ? "1.5px solid var(--foreground)"
                    : "1.5px solid transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right section: studio + logout */}
        <div className="dashboard-nav-right">
          {studioName && (
            <span
              style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "var(--text-label)",
                fontWeight: 500,
                letterSpacing: "var(--tracking-label)",
                textTransform: "uppercase",
                opacity: 0.25,
              }}
            >
              {studioName}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "var(--text-label)",
              fontWeight: 500,
              letterSpacing: "var(--tracking-label)",
              textTransform: "uppercase",
              background: "transparent",
              border: "none",
              color: "var(--foreground)",
              opacity: 0.2,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Uitloggen
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="dashboard-nav-hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? "\u2715" : "\u2630"}
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
                  fontSize: "var(--text-label)",
                  fontWeight: 500,
                  letterSpacing: "var(--tracking-label)",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  color: "var(--foreground)",
                  padding: "10px 0",
                  opacity: isActive ? 1 : 0.2,
                }}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "var(--text-label)",
              fontWeight: 500,
              letterSpacing: "var(--tracking-label)",
              textTransform: "uppercase",
              background: "transparent",
              border: "none",
              color: "var(--foreground)",
              opacity: 0.2,
              cursor: "pointer",
              padding: "10px 0",
              marginTop: 8,
            }}
          >
            Uitloggen
          </button>
        </nav>
      )}
    </header>
  );
}
