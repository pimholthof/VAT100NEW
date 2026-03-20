"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DashboardNav({
  studioName,
  isAdvisor = false,
}: {
  studioName?: string;
  isAdvisor?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

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

  // Focus trap for drawer
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isDrawerOpen) return;

    if (e.key === "Escape") {
      setIsDrawerOpen(false);
      toggleRef.current?.focus();
      return;
    }

    if (e.key === "Tab" && drawerRef.current) {
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [isDrawerOpen]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Focus first link when drawer opens
  useEffect(() => {
    if (isDrawerOpen && drawerRef.current) {
      const firstLink = drawerRef.current.querySelector<HTMLElement>("a[href]");
      firstLink?.focus();
    }
  }, [isDrawerOpen]);

  return (
    <nav aria-label="Hoofdnavigatie" className="nav-header">
      <div className="nav-bar">
        <Link href="/dashboard" className="nav-logo">
          VAT100
        </Link>

        <div className="nav-right">
          {studioName && (
            <span className="nav-studio">{studioName}</span>
          )}
          <button
            ref={toggleRef}
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="nav-toggle"
            data-open={isDrawerOpen}
            aria-expanded={isDrawerOpen}
            aria-controls="nav-drawer"
            aria-label={isDrawerOpen ? "Sluit navigatiemenu" : "Open navigatiemenu"}
          >
            {isDrawerOpen ? "SLUIT" : "MENU"}
          </button>
        </div>
      </div>

      <div
        id="nav-drawer"
        ref={drawerRef}
        className="nav-drawer"
        role="region"
        aria-label="Navigatiemenu"
        aria-hidden={!isDrawerOpen}
        style={{ display: isDrawerOpen ? undefined : "none" }}
      >
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
            <span className="nav-section-label">Beheer</span>
            <Link
              href="/dashboard/activa"
              className="nav-link"
              data-active={isActive("/dashboard/activa")}
              onClick={() => setIsDrawerOpen(false)}
            >
              Activa
            </Link>
            <Link
              href="/dashboard/documenten"
              className="nav-link"
              data-active={isActive("/dashboard/documenten")}
              onClick={() => setIsDrawerOpen(false)}
            >
              Documenten
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
              href="/dashboard/jaarrekening"
              className="nav-link"
              data-active={isActive("/dashboard/jaarrekening")}
              onClick={() => setIsDrawerOpen(false)}
            >
              Jaarrekening
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

          {isAdvisor && (
            <div className="nav-section">
              <span className="nav-section-label">Advisor</span>
              <Link
                href="/dashboard/advisor"
                className="nav-link"
                data-active={isActive("/dashboard/advisor")}
                onClick={() => setIsDrawerOpen(false)}
              >
                Klantenoverzicht
              </Link>
            </div>
          )}

          <div className="nav-session-section">
            <span className="nav-section-label">Sessie</span>
            <button
              type="button"
              onClick={handleLogout}
              className="nav-logout"
            >
              Verlaten
            </button>
            <p className="nav-meta" suppressHydrationWarning>
              {quarter} — {year}
            </p>
          </div>
        </div>
      </div>
    </nav>
  );
}
