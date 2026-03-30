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
    <div style={{ position: "sticky", top: 0, zIndex: 1000, background: "var(--background)", borderBottom: "var(--border-light)" }}>
      <header style={{ padding: isMobile ? "16px 20px" : "40px 4vw", maxWidth: 1600, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link 
              href="/dashboard"
              className="label" 
              style={{ 
                fontSize: "12px", 
                letterSpacing: "0.25em", 
                color: "var(--foreground)", 
                opacity: 0.3,
                textDecoration: "none",
                textTransform: "uppercase"
              }}
            >
              VAT0921
            </Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 32 }}>
            {!isMobile && (
              <span className="label" style={{ opacity: 0.2 }}>{studioName}</span>
            )}
            <button
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
            style={{ overflow: "hidden", background: "var(--background)", borderBottom: "var(--border-light)" }}
          >
            <div style={{ 
              padding: isMobile ? "32px 20px 40px" : "40px 80px 80px 80px", 
              display: "grid", 
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", 
              gap: isMobile ? "32px" : "40px" 
            }}>
              
              {/* Navigation Column 1 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <span className="label" style={{ marginBottom: 16 }}>Overzicht</span>
                <Link href="/dashboard" onClick={() => setIsDrawerOpen(false)} className="display-title" style={{ fontSize: isMobile ? "1.5rem" : "2rem", textDecoration: "none", color: "var(--foreground)" }}>OVERZICHT</Link>
                <Link href="/dashboard/invoices" onClick={() => setIsDrawerOpen(false)} className="display-title" style={{ fontSize: isMobile ? "1.5rem" : "2rem", textDecoration: "none", color: "var(--foreground)", opacity: 0.4 }}>FACTUREN</Link>
                <Link href="/dashboard/clients" onClick={() => setIsDrawerOpen(false)} className="display-title" style={{ fontSize: isMobile ? "1.5rem" : "2rem", textDecoration: "none", color: "var(--foreground)", opacity: 0.4 }}>KLANTEN</Link>
              </div>

              {/* Navigation Column 2 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <span className="label" style={{ marginBottom: 16 }}>Beheer</span>
                <Link href="/dashboard/bank" onClick={() => setIsDrawerOpen(false)} className="display-title" style={{ fontSize: isMobile ? "1.5rem" : "2rem", textDecoration: "none", color: "var(--foreground)", opacity: 0.4 }}>TRANSACTIES</Link>
                <Link href="/dashboard/tax" onClick={() => setIsDrawerOpen(false)} className="display-title" style={{ fontSize: isMobile ? "1.5rem" : "2rem", textDecoration: "none", color: "var(--foreground)", opacity: 0.4 }}>BELASTING</Link>
                <Link href="/dashboard/settings" onClick={() => setIsDrawerOpen(false)} className="display-title" style={{ fontSize: isMobile ? "1.5rem" : "2rem", textDecoration: "none", color: "var(--foreground)", opacity: 0.4 }}>INSTELLINGEN</Link>
              </div>

              {/* Action Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: isMobile ? "flex-start" : "flex-end" }}>
                <span className="label" style={{ marginBottom: 16 }}>Account</span>
                {isMobile && studioName && (
                  <span className="label" style={{ opacity: 0.4, marginBottom: 8 }}>{studioName}</span>
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
                    opacity: 0.5,
                    color: "var(--foreground)"
                  }}
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
