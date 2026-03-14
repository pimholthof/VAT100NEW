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
          className="font-display text-[18px] font-black tracking-[0.02em] no-underline text-foreground leading-none"
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
                className={`font-body text-[12px] font-normal tracking-[0.02em] no-underline text-foreground transition-opacity duration-150 ${
                  isActive ? "opacity-100" : "opacity-40"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right section: user + logout */}
        <div className="dashboard-nav-right">
          {studioName && (
            <span className="font-body text-[9px] font-normal tracking-[0.05em] opacity-40">
              {studioName}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="font-body text-[9px] font-normal tracking-[0.02em] bg-transparent border-0 text-foreground opacity-40 cursor-pointer p-0"
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
                className={`block font-body text-[12px] font-normal tracking-[0.02em] no-underline text-foreground py-2.5 ${
                  isActive ? "opacity-100" : "opacity-40"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            className="font-body text-[9px] font-normal tracking-[0.02em] bg-transparent border-0 text-foreground opacity-40 cursor-pointer py-2.5 px-0 mt-2"
          >
            Uitloggen
          </button>
        </nav>
      )}
    </header>
  );
}
