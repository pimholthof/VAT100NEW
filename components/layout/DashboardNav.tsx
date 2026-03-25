"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useInvoiceStore } from "@/lib/store/invoice";
import { useQuoteStore } from "@/lib/store/quote";
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

const NAV_ITEMS = [
  { href: "/dashboard", label: "OVERZICHT", match: (p: string) => p === "/dashboard" },
  { href: "/dashboard/quotes", label: "OFFERTES", match: (p: string) => p.startsWith("/dashboard/quotes") },
  { href: "/dashboard/invoices", label: "FACTUREN", match: (p: string) => p.startsWith("/dashboard/invoices") },
  { href: "/dashboard/clients", label: "KLANTEN", match: (p: string) => p.startsWith("/dashboard/clients") },
] as const;

const SYSTEM_ITEMS = [
  { href: "/dashboard/bank", label: "TRANSACTIES", match: (p: string) => p.startsWith("/dashboard/bank") },
  { href: "/dashboard/tax", label: "BELASTING", match: (p: string) => p.startsWith("/dashboard/tax") },
  { href: "/dashboard/settings", label: "INSTELLINGEN", match: (p: string) => p.startsWith("/dashboard/settings") },
  { href: "/dashboard/receipts", label: "BONNEN", match: (p: string) => p.startsWith("/dashboard/receipts") },
] as const;

export function DashboardNav({
  studioName,
}: {
  studioName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isMobile = useIsMobile();

  async function handleLogout() {
    useInvoiceStore.getState().resetForm();
    useQuoteStore.getState().resetForm();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const closeDrawer = () => setIsDrawerOpen(false);

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 1000, background: "var(--background)" }}>
      <header style={{ padding: isMobile ? "0 20px" : "0 48px" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: isMobile ? 64 : 80,
          borderBottom: isDrawerOpen ? "none" : "0.5px solid rgba(0,0,0,0.06)",
        }}>
          <Link
            href="/dashboard"
            style={{
              fontSize: isMobile ? "1.25rem" : "1.5rem",
              fontWeight: 800,
              letterSpacing: "-0.05em",
              color: "var(--foreground)",
              textDecoration: "none",
            }}
          >
            VAT100
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 24 }}>
            {!isMobile && studioName && (
              <span className="label" style={{ opacity: 0.3 }}>{studioName}</span>
            )}
            {!isMobile && (
              <button
                onClick={() => {
                  window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
                }}
                className="label"
                style={{
                  background: "rgba(0,0,0,0.02)",
                  border: "0.5px solid rgba(0,0,0,0.06)",
                  padding: "5px 10px",
                  cursor: "pointer",
                  opacity: 0.35,
                  fontSize: 10,
                  color: "var(--foreground)",
                }}
                title="Zoeken (⌘K)"
              >
                ⌘K
              </button>
            )}
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="label-strong"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px 0",
                borderBottom: isDrawerOpen ? "1px solid var(--foreground)" : "1px solid transparent",
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
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{
              overflow: "hidden",
              background: "var(--background)",
              borderBottom: "0.5px solid rgba(0,0,0,0.06)",
            }}
          >
            <nav style={{
              padding: isMobile ? "32px 20px 40px" : "48px 48px 56px",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
              gap: isMobile ? "36px" : "48px",
            }}>
              {/* Column 1: Index */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <span className="label" style={{ marginBottom: 12, opacity: 0.3 }}>Index</span>
                {NAV_ITEMS.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeDrawer}
                    aria-current={item.match(pathname) ? "page" : undefined}
                    style={{
                      fontSize: isMobile ? "1.5rem" : "2rem",
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.1,
                      textDecoration: "none",
                      color: "var(--foreground)",
                      opacity: item.match(pathname) ? 1 : 0.25,
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* Column 2: Systemen */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <span className="label" style={{ marginBottom: 12, opacity: 0.3 }}>Systemen</span>
                {SYSTEM_ITEMS.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeDrawer}
                    aria-current={item.match(pathname) ? "page" : undefined}
                    style={{
                      fontSize: isMobile ? "1.5rem" : "2rem",
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.1,
                      textDecoration: "none",
                      color: "var(--foreground)",
                      opacity: item.match(pathname) ? 1 : 0.25,
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* Column 3: Sessie */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: isMobile ? "flex-start" : "flex-end" }}>
                <span className="label" style={{ marginBottom: 12, opacity: 0.3 }}>Sessie</span>
                {isMobile && studioName && (
                  <span className="label" style={{ opacity: 0.3 }}>{studioName}</span>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="label-strong"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    opacity: 0.4,
                    color: "var(--foreground)",
                  }}
                >
                  VERLATEN
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
