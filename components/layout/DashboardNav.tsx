"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { m as motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/lib/i18n/context";

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
  const { locale, t, setLocale } = useLocale();

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
              VAT100
            </Link>
          </div>

          <div className="dashboard-nav-actions">
            {!isMobile && (
              <span className="nav-studio-name">{studioName}</span>
            )}
            <button
              onClick={() => setLocale(locale === "nl" ? "en" : "nl")}
              className="label-strong"
              style={{
                fontSize: "11px",
                letterSpacing: "0.15em",
                background: "transparent",
                border: "0.5px solid rgba(0,0,0,0.12)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                padding: "4px 8px",
                transition: "opacity 0.2s ease",
                color: "var(--foreground)",
                fontWeight: 600,
                opacity: 0.5,
              }}
              aria-label={locale === "nl" ? "Switch to English" : "Schakel naar Nederlands"}
            >
              {locale === "nl" ? "EN" : "NL"}
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
              {isDrawerOpen ? t.nav.closeMenu : t.nav.menu}
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

              {/* Navigation - column 1 */}
              <div className="dashboard-drawer-col">
                <span className="label mb-4">Menu</span>
                <Link href="/dashboard" onClick={() => setIsDrawerOpen(false)} className="drawer-link drawer-link-active">{t.nav.overview}</Link>
                <Link href="/dashboard/invoices" onClick={() => setIsDrawerOpen(false)} className="drawer-link">{t.nav.invoices}</Link>
                <Link href="/dashboard/clients" onClick={() => setIsDrawerOpen(false)} className="drawer-link">{t.nav.clients}</Link>
                <Link href="/dashboard/expenses" onClick={() => setIsDrawerOpen(false)} className="drawer-link">{t.nav.expenses}</Link>
                <Link href="/dashboard/assets" onClick={() => setIsDrawerOpen(false)} className="drawer-link">{t.nav.assets}</Link>
                <Link href="/dashboard/resources" onClick={() => setIsDrawerOpen(false)} className="drawer-link">Kennisbank</Link>
                <Link href="/dashboard/assistant" onClick={() => setIsDrawerOpen(false)} className="drawer-link">AI Assistent</Link>
              </div>

              {/* Navigation - column 2 */}
              <div className="dashboard-drawer-col">
                <span className="label mb-4">&nbsp;</span>
                <Link href="/dashboard/hours" onClick={() => setIsDrawerOpen(false)} className="drawer-link">{t.nav.hours}</Link>
                <Link href="/dashboard/trips" onClick={() => setIsDrawerOpen(false)} className="drawer-link">{t.nav.trips}</Link>
                <Link href="/dashboard/tax" onClick={() => setIsDrawerOpen(false)} className="drawer-link">{t.nav.tax}</Link>
                <Link href="/dashboard/documents" onClick={() => setIsDrawerOpen(false)} className="drawer-link">{t.nav.documents}</Link>
                <Link href="/dashboard/import" onClick={() => setIsDrawerOpen(false)} className="drawer-link">{t.nav.import}</Link>
              </div>

              {/* Account */}
              <div className="dashboard-drawer-col dashboard-drawer-col-end">
                <span className="label mb-4">{t.nav.account}</span>
                {isMobile && studioName && (
                  <span className="label opacity-40 mb-2">{studioName}</span>
                )}
                <Link href="/dashboard/settings" onClick={() => setIsDrawerOpen(false)} className="drawer-link">{t.nav.settings}</Link>
                <Link href="/dashboard/settings/subscription" onClick={() => setIsDrawerOpen(false)} className="drawer-link">Abonnement</Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="drawer-logout"
                >
                  {t.nav.logout}
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
