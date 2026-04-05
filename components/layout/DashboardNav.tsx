"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { m as motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/lib/i18n/context";
import { QuickActionMenu } from "@/components/ui/QuickActionMenu";

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
  unreadMessages = 0,
}: {
  studioName?: string;
  unreadMessages?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isMobile = useIsMobile();
  const { locale, t, setLocale } = useLocale();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  function linkClass(href: string) {
    return isActive(href) ? "drawer-link drawer-link-active" : "drawer-link";
  }

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
            <QuickActionMenu />
            {!isMobile && (
              <kbd
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.05em",
                  opacity: 0.2,
                  padding: "3px 6px",
                  border: "0.5px solid rgba(0,0,0,0.12)",
                  borderRadius: "var(--radius-sm)",
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
                onClick={() => {
                  document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
                }}
                title="Cmd+K"
              >
                ⌘K
              </kbd>
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

              {/* Main navigation */}
              <div className="dashboard-drawer-col">
                <span className="label mb-4">Menu</span>
                <Link href="/dashboard" onClick={() => setIsDrawerOpen(false)} className={linkClass("/dashboard")}>{t.nav.overview}</Link>
                <Link href="/dashboard/invoices" onClick={() => setIsDrawerOpen(false)} className={linkClass("/dashboard/invoices")}>{t.nav.invoices}</Link>
                <Link href="/dashboard/clients" onClick={() => setIsDrawerOpen(false)} className={linkClass("/dashboard/clients")}>{t.nav.clients}</Link>
                <Link href="/dashboard/expenses" onClick={() => setIsDrawerOpen(false)} className={linkClass("/dashboard/expenses")}>{t.nav.expenses}</Link>
                <Link href="/dashboard/tax" onClick={() => setIsDrawerOpen(false)} className={linkClass("/dashboard/tax")}>{t.nav.tax}</Link>
                <Link href="/dashboard/berichten" onClick={() => setIsDrawerOpen(false)} className={linkClass("/dashboard/berichten")} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  Berichten
                  {unreadMessages > 0 && (
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-accent, #E53E3E)", flexShrink: 0 }} />
                  )}
                </Link>
              </div>

              {/* Account */}
              <div className="dashboard-drawer-col dashboard-drawer-col-end">
                <span className="label mb-4">{t.nav.account}</span>
                {isMobile && studioName && (
                  <span className="label opacity-40 mb-2">{studioName}</span>
                )}
                <Link href="/dashboard/settings" onClick={() => setIsDrawerOpen(false)} className={linkClass("/dashboard/settings")}>{t.nav.settings}</Link>
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
