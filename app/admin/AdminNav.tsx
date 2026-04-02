"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { m as motion, AnimatePresence } from "framer-motion";

export function AdminNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const items = [
    { href: "/admin", label: "Overzicht", match: "/admin" },
    { href: "/admin/users", label: "Gebruikers", match: "/admin/users" },
    { href: "/admin/pipeline", label: "Pipeline", match: "/admin/pipeline" },
    { href: "/admin/feedback", label: "Feedback", match: "/admin/feedback" },
    { href: "/admin/settings", label: "Instellingen", match: "/admin/settings" },
  ];

  function isActive(match: string) {
    return match === "/admin" ? pathname === "/admin" : pathname.startsWith(match);
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
            <Link href="/admin" className="display-hero dashboard-nav-brand">
              VAT100
            </Link>
            <span className="admin-nav-badge">
              Admin
            </span>
          </div>

          <div className="dashboard-nav-actions">
            <nav className="admin-nav-links-desktop" aria-label="Admin navigatie">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="admin-nav-link"
                  data-active={isActive(item.match)}
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/dashboard" className="admin-nav-link" data-active={false}>
                Dashboard
              </Link>
            </nav>
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
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsDrawerOpen(false)}
                    className={`drawer-link${isActive(item.match) ? " drawer-link-active" : ""}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="dashboard-drawer-col dashboard-drawer-col-end">
                <span className="label mb-4">Account</span>
                <Link href="/dashboard" onClick={() => setIsDrawerOpen(false)} className="drawer-link">
                  Terug naar Dashboard
                </Link>
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
