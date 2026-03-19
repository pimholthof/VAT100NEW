"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DashboardNav({
  studioName,
}: {
  studioName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const now = new Date();
  const quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}`;
  const year = now.getFullYear();

  return (
    <div className="nav-header">
      <div className="nav-bar">
        <Link href="/dashboard" className="nav-logo">
          VAT100
        </Link>

        <div className="nav-right">
          {studioName && (
            <span className="nav-studio">{studioName}</span>
          )}
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="nav-toggle"
            data-open={isDrawerOpen}
          >
            {isDrawerOpen ? "SLUIT" : "MENU"}
          </button>
        </div>
      </div>

      {isDrawerOpen && (
        <div className="nav-drawer">
          <div className="nav-drawer-inner">
            <div className="nav-section">
              <span className="nav-section-label">Index</span>
              <Link
                href="/dashboard"
                className="nav-link"
                data-active={isActive("/dashboard")}
                onClick={() => setIsDrawerOpen(false)}
              >
                Overzicht
              </Link>
              <Link
                href="/dashboard/invoices"
                className="nav-link"
                data-active={isActive("/dashboard/invoices")}
                onClick={() => setIsDrawerOpen(false)}
              >
                Facturen
              </Link>
              <Link
                href="/dashboard/clients"
                className="nav-link"
                data-active={isActive("/dashboard/clients")}
                onClick={() => setIsDrawerOpen(false)}
              >
                Klanten
              </Link>
              <Link
                href="/dashboard/receipts"
                className="nav-link"
                data-active={isActive("/dashboard/receipts")}
                onClick={() => setIsDrawerOpen(false)}
              >
                Bonnen
              </Link>
            </div>

            <div className="nav-section">
              <span className="nav-section-label">Systemen</span>
              <Link
                href="/dashboard/bank"
                className="nav-link"
                data-active={isActive("/dashboard/bank")}
                onClick={() => setIsDrawerOpen(false)}
              >
                Transacties
              </Link>
              <Link
                href="/dashboard/tax"
                className="nav-link"
                data-active={isActive("/dashboard/tax")}
                onClick={() => setIsDrawerOpen(false)}
              >
                Belasting
              </Link>
              <Link
                href="/dashboard/settings"
                className="nav-link"
                data-active={isActive("/dashboard/settings")}
                onClick={() => setIsDrawerOpen(false)}
              >
                Instellingen
              </Link>
            </div>

            <div className="nav-session-section">
              <span className="nav-section-label">Sessie</span>
              <button
                type="button"
                onClick={handleLogout}
                className="nav-logout"
              >
                Verlaten
              </button>
              <p className="nav-meta">
                {quarter} — {year}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
