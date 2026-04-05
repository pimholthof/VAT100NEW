"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { m as motion, AnimatePresence } from "framer-motion";
import { AdminGlobalSearch } from "@/features/admin/AdminGlobalSearch";

const klantenItems = [
  { href: "/admin/klanten", label: "Klanten", match: "/admin/klanten" },
  { href: "/admin/klanten/facturen", label: "Facturen", match: "/admin/klanten/facturen" },
  { href: "/admin/klanten/bank", label: "Bank", match: "/admin/klanten/bank" },
  { href: "/admin/klanten/feedback", label: "Feedback", match: "/admin/klanten/feedback" },
];

const vat100Items = [
  { href: "/admin", label: "Beheercentrum", match: "/admin" },
  { href: "/admin/groei", label: "Groei", match: "/admin/groei" },
  { href: "/admin/pipeline", label: "Pipeline", match: "/admin/pipeline" },
  { href: "/admin/financials", label: "Financieel", match: "/admin/financials" },
  { href: "/admin/systeem", label: "Systeem", match: "/admin/systeem" },
];

export function AdminNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  function isActive(match: string) {
    if (match === "/admin") return pathname === "/admin";
    return pathname.startsWith(match);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="dashboard-nav">
      <AdminGlobalSearch />
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
              {/* Klanten groep */}
              <span className="admin-nav-group-label">KLANTEN</span>
              {klantenItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="admin-nav-link"
                  data-active={isActive(item.match)}
                >
                  {item.label}
                </Link>
              ))}

              {/* Divider */}
              <span className="admin-nav-divider" />

              {/* VAT100 groep */}
              <span className="admin-nav-group-label">VAT100</span>
              {vat100Items.map((item) => (
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
              <div className="dashboard-drawer-col">
                <span className="label mb-4">KLANTEN</span>
                {klantenItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsDrawerOpen(false)}
                    className={`drawer-link${isActive(item.match) ? " drawer-link-active" : ""}`}
                  >
                    {item.label}
                  </Link>
                ))}

                <span className="label mb-4" style={{ marginTop: 24 }}>VAT100</span>
                {vat100Items.map((item) => (
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
