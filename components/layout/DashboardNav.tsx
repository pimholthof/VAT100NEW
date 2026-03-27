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
              VAT100
            </Link>
          </div>

          <div className="dashboard-nav-actions">
            {!isMobile && (
              <span className="label opacity-40">{studioName}</span>
            )}
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="label-strong dashboard-nav-menu"
              data-open={isDrawerOpen}
            >
              {isDrawerOpen ? "CLOSE" : "MENU"}
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
              
              {/* Navigation Column 1 */}
              <div className="dashboard-drawer-col">
                <span className="label mb-4">Menu</span>
                <Link href="/dashboard" onClick={() => setIsDrawerOpen(false)} className="drawer-link drawer-link-active">Overzicht</Link>
                <Link href="/dashboard/quotes" onClick={() => setIsDrawerOpen(false)} className="drawer-link">Offertes</Link>
                <Link href="/dashboard/invoices" onClick={() => setIsDrawerOpen(false)} className="drawer-link">Facturen</Link>
                <Link href="/dashboard/clients" onClick={() => setIsDrawerOpen(false)} className="drawer-link">Klanten</Link>
                <Link href="/dashboard/receipts" onClick={() => setIsDrawerOpen(false)} className="drawer-link">Bonnen</Link>
              </div>

              {/* Navigation Column 2 */}
              <div className="dashboard-drawer-col">
                <span className="label mb-4">Geld</span>
                <Link href="/dashboard/bank" onClick={() => setIsDrawerOpen(false)} className="drawer-link">Transacties</Link>
                <Link href="/dashboard/tax" onClick={() => setIsDrawerOpen(false)} className="drawer-link">Belasting</Link>
                <Link href="/dashboard/report" onClick={() => setIsDrawerOpen(false)} className="drawer-link">Jaarrekening</Link>
                <Link href="/dashboard/settings" onClick={() => setIsDrawerOpen(false)} className="drawer-link">Instellingen</Link>
              </div>

              {/* Action Column */}
              <div className="dashboard-drawer-col dashboard-drawer-col-end">
                <span className="label mb-4">Account</span>
                {isMobile && studioName && (
                  <span className="label opacity-40 mb-2">{studioName}</span>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="drawer-logout"
                >
                  Uitloggen
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
