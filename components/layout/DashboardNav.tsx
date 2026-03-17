"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

export function DashboardNav({
  studioName,
}: {
  studioName?: string;
}) {
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      <header className="dashboard-nav" style={{ padding: "40px 80px", background: "var(--background)", borderBottom: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <span className="label-strong" style={{ fontSize: "12px", letterSpacing: "0.05em" }}>
              VAT100
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <span className="label" style={{ opacity: 0.4 }}>{studioName}</span>
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="label-strong"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px 0",
                borderBottom: isDrawerOpen ? "1px solid var(--foreground)" : "1px solid transparent",
                transition: "border-color 0.2s ease"
              }}
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
            style={{ overflow: "hidden", background: "var(--background)", borderBottom: "var(--border-light)" }}
          >
            <div style={{ padding: "40px 80px 80px 80px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "40px" }}>
              
              {/* Navigation Column 1 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <span className="label" style={{ marginBottom: 16 }}>Index</span>
                <Link href="/dashboard" className="display-title" style={{ fontSize: "2rem", textDecoration: "none", color: "var(--foreground)" }}>OVERVIEW</Link>
                <Link href="/dashboard/invoices" className="display-title" style={{ fontSize: "2rem", textDecoration: "none", color: "var(--foreground)", opacity: 0.4 }}>INVOICES</Link>
                <Link href="/dashboard/clients" className="display-title" style={{ fontSize: "2rem", textDecoration: "none", color: "var(--foreground)", opacity: 0.4 }}>CLIENTS</Link>
              </div>

              {/* Navigation Column 2 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <span className="label" style={{ marginBottom: 16 }}>Systems</span>
                <Link href="/dashboard/bank" className="display-title" style={{ fontSize: "2rem", textDecoration: "none", color: "var(--foreground)", opacity: 0.4 }}>BANKING</Link>
                <Link href="/dashboard/tax" className="display-title" style={{ fontSize: "2rem", textDecoration: "none", color: "var(--foreground)", opacity: 0.4 }}>TAX SHIELD</Link>
                <Link href="/dashboard/settings" className="display-title" style={{ fontSize: "2rem", textDecoration: "none", color: "var(--foreground)", opacity: 0.4 }}>SETTINGS</Link>
              </div>

              {/* Action Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-end" }}>
                <span className="label" style={{ marginBottom: 16 }}>Actions</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="label-strong"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    opacity: 0.5
                  }}
                >
                  SIGN OUT
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
