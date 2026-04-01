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

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const navLinks = [
    { href: "/admin", label: "Overzicht" },
    { href: "/admin/pipeline", label: "Pipeline" },
    { href: "/admin/customers", label: "Klanten" },
    { href: "/admin/users", label: "Gebruikers" },
    { href: "/admin/waitlist", label: "Wachtlijst" },
    { href: "/admin/feedback", label: "Feedback" },
    { href: "/admin/audit", label: "Controle" },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <div className="dashboard-nav">
      <header className="dashboard-nav-header">
        <div className="dashboard-nav-inner">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="display-hero dashboard-nav-brand">
              VAT100
            </Link>
            <span
              className="label-strong"
              style={{
                fontSize: "9px",
                letterSpacing: "0.15em",
                opacity: 0.4,
              }}
            >
              BEHEER
            </span>
          </div>

          <div className="dashboard-nav-actions">
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
                fontWeight: 700,
              }}
            >
              {isDrawerOpen ? "SLUITEN" : "MENU"}
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
              {/* Navigatie */}
              <div className="dashboard-drawer-col">
                <span className="label mb-4">Navigatie</span>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsDrawerOpen(false)}
                    className={`drawer-link ${isActive(link.href) ? "drawer-link-active" : ""}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Account */}
              <div className="dashboard-drawer-col dashboard-drawer-col-end">
                <span className="label mb-4">Account</span>
                <Link
                  href="/dashboard"
                  onClick={() => setIsDrawerOpen(false)}
                  className="drawer-link"
                >
                  Terug naar dashboard
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
