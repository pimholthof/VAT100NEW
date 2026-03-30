"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { m as motion, AnimatePresence } from "framer-motion";

function useIsMobile(breakpoint = 768) {
  const subscribe = useCallback((callback: () => void) => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
  }, [breakpoint]);

  const getSnapshot = useCallback(() => {
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
  }, [breakpoint]);

  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function DashboardNav({
  studioName,
}: {
  studioName?: string;
}) {
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isMobile = useIsMobile();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="dashboard-nav">
      <header className="dashboard-nav-header">
        <div className="dashboard-nav-inner">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="display-hero dashboard-nav-brand">
              VAT0921
            </Link>
          </div>

          <div className="dashboard-nav-actions">
            {!isMobile && (
              <span className="nav-studio-name">{studioName}</span>
            )}
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="label-strong dashboard-nav-menu"
              data-open={isDrawerOpen}
            >
              [ UPLOAD ]
            </button>
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="label-strong"
              style={{
                fontSize: "12px", 
                letterSpacing: "0.25em", 
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px 0",
                transition: "opacity 0.2s ease",
                color: "var(--foreground)",
                fontWeight: 700
              }}
            >
              {isDrawerOpen ? "SLUIT" : "MENU"}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="dashboard-drawer"
          >
            <div className="dashboard-drawer-inner">
              
              {/* Navigation */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <span className="label" style={{ marginBottom: 16 }}>Overzicht</span>
                <Link href="/dashboard" onClick={() => setIsDrawerOpen(false)} className="display-title" style={{ fontSize: isMobile ? "1.5rem" : "2rem", textDecoration: "none", color: "var(--foreground)" }}>OVERZICHT</Link>
                <Link href="/dashboard/invoices" onClick={() => setIsDrawerOpen(false)} className="drawer-link">Facturen</Link>
                <Link href="/dashboard/clients" onClick={() => setIsDrawerOpen(false)} className="drawer-link">Klanten</Link>
                <Link href="/dashboard/expenses" onClick={() => setIsDrawerOpen(false)} className="drawer-link">Uitgaven</Link>
                <Link href="/dashboard/assets" onClick={() => setIsDrawerOpen(false)} className="drawer-link">Activa</Link>
                <Link href="/dashboard/hours" onClick={() => setIsDrawerOpen(false)} className="drawer-link">Uren</Link>
                <Link href="/dashboard/trips" onClick={() => setIsDrawerOpen(false)} className="drawer-link">Kilometers</Link>
                <Link href="/dashboard/tax" onClick={() => setIsDrawerOpen(false)} className="drawer-link">Belasting</Link>
                <Link href="/dashboard/import" onClick={() => setIsDrawerOpen(false)} className="drawer-link">Importeren</Link>
              </div>

              {/* Action Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: isMobile ? "flex-start" : "flex-end" }}>
                <span className="label" style={{ marginBottom: 16 }}>Account</span>
                {isMobile && studioName && (
                  <span className="label opacity-40 mb-2">{studioName}</span>
                )}
                <Link href="/dashboard/settings" onClick={() => setIsDrawerOpen(false)} className="drawer-link">Instellingen</Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="drawer-logout"
                >
                  UITLOGGEN
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
