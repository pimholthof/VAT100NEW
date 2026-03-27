"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { m as motion, AnimatePresence } from "framer-motion";

export function AdminNav() {
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
            <Link href="/admin" className="display-hero dashboard-nav-brand">
              VAT100
            </Link>
            <span
              className="label"
              style={{
                background: "var(--foreground)",
                color: "var(--background)",
                padding: "2px 8px",
                fontSize: 9,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Admin
            </span>
          </div>

          <div className="dashboard-nav-actions">
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
              <div className="dashboard-drawer-col">
                <span className="label mb-4">Beheer</span>
                <Link href="/admin" onClick={() => setIsDrawerOpen(false)} className="drawer-link">
                  Platform Overzicht
                </Link>
                <Link href="/admin/users" onClick={() => setIsDrawerOpen(false)} className="drawer-link">
                  Gebruikers
                </Link>
                <Link href="/admin/waitlist" onClick={() => setIsDrawerOpen(false)} className="drawer-link">
                  Wachtlijst
                </Link>
              </div>

              <div className="dashboard-drawer-col">
                <span className="label mb-4">Navigatie</span>
                <Link href="/dashboard" onClick={() => setIsDrawerOpen(false)} className="drawer-link">
                  Terug naar Dashboard
                </Link>
              </div>

              <div className="dashboard-drawer-col dashboard-drawer-col-end">
                <span className="label mb-4">Account</span>
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
