"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

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

  const navLinks = [
    { href: "/dashboard", label: "OVERZICHT" },
    { href: "/dashboard/invoices", label: "FACTUREN" },
    { href: "/dashboard/clients", label: "KLANTEN" },
    { href: "/dashboard/bank", label: "TRANSACTIES" },
    { href: "/dashboard/tax", label: "BELASTING" },
    { href: "/dashboard/receipts", label: "BONNETJES" },
    { href: "/dashboard/settings", label: "INSTELLINGEN" },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 1000,
      background: "var(--background)",
      borderBottom: "0.5px solid rgba(13, 13, 11, 0.08)",
    }}>
      <header style={{ padding: "0 80px" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: 72,
        }}>
          <Link
            href="/dashboard"
            className="label-strong"
            style={{
              fontSize: 12,
              letterSpacing: "0.05em",
              color: "var(--foreground)",
              textDecoration: "none",
            }}
          >
            VAT100
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <span className="label" style={{ opacity: 0.3 }}>{studioName}</span>
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="label-strong"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px 0",
                borderBottom: isDrawerOpen
                  ? "0.5px solid var(--foreground)"
                  : "0.5px solid transparent",
                transition: "border-color 0.2s ease",
                color: "var(--foreground)",
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
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              overflow: "hidden",
              background: "var(--background)",
              borderTop: "0.5px solid rgba(13, 13, 11, 0.08)",
            }}
          >
            <div style={{
              padding: "var(--space-block) 80px var(--space-section) 80px",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-element)",
            }}>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsDrawerOpen(false)}
                  className="display-title"
                  style={{
                    fontSize: "2.5rem",
                    textDecoration: "none",
                    color: "var(--foreground)",
                    opacity: isActive(link.href) ? 1 : 0.3,
                    transition: "opacity 0.15s ease",
                    borderBottom: isActive(link.href)
                      ? "1px solid var(--foreground)"
                      : "none",
                    display: "inline-block",
                    paddingBottom: 4,
                    alignSelf: "flex-start",
                  }}
                >
                  {link.label}
                </Link>
              ))}

              <div style={{
                borderTop: "0.5px solid rgba(13, 13, 11, 0.08)",
                marginTop: "var(--space-element)",
                paddingTop: "var(--space-element)",
              }}>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="label"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    opacity: 0.3,
                    color: "var(--foreground)",
                  }}
                >
                  VERLATEN
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
