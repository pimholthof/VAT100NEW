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

  const sidebar = (
    <aside className="dashboard-sidebar" data-open={mobileOpen || undefined}>
      {/* Logo + user info */}
      <div style={{ padding: "32px 24px 24px" }}>
        <Link
          href="/dashboard"
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "24px",
            fontWeight: 900,
            letterSpacing: "var(--tracking-display)",
            textDecoration: "none",
            color: "var(--foreground)",
            display: "block",
            lineHeight: 1,
          }}
        >
          VAT100
        </Link>
        <div
          style={{
            marginTop: 12,
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-md)",
            fontWeight: 400,
            letterSpacing: "0.05em",
            lineHeight: 1.4,
          }}
        >
          <span style={{ display: "block", opacity: 0.6 }}>{userName}</span>
          {studioName && (
            <span style={{ display: "block", opacity: 0.4, fontSize: "var(--text-body-sm)" }}>
              {studioName}
            </span>
          )}
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "8px 0" }}>
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
              className="sidebar-nav-item"
              data-active={isActive || undefined}
              style={{
                display: "block",
                padding: "10px 24px",
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "13px",
                fontWeight: 400,
                letterSpacing: "0.05em",
                textDecoration: "none",
                color: isActive ? "var(--color-white)" : "var(--foreground)",
                background: isActive ? "var(--color-black)" : "transparent",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout button at bottom */}
      <div style={{ padding: "16px 24px 32px" }}>
        <form action={logout}>
          <button
            type="submit"
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "13px",
              fontWeight: 400,
              letterSpacing: "0.05em",
              padding: "10px 24px",
              border: "none",
              borderBottom: "1px solid rgba(13, 13, 11, 0.15)",
              background: "transparent",
              color: "var(--foreground)",
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
            }}
          >
            Uitloggen
          </button>
        </form>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="sidebar-hamburger"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Menu"
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 1001,
          background: "var(--background)",
          border: "1px solid rgba(13, 13, 11, 0.15)",
          color: "var(--foreground)",
          width: 40,
          height: 40,
          display: "none",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "18px",
          lineHeight: 1,
        }}
      >
        {mobileOpen ? "✕" : "☰"}
      </button>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 999,
            display: "none",
          }}
        />
      )}

      {sidebar}
    </>
  );
}
