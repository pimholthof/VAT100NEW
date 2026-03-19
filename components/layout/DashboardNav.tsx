"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    <div style={{ position: "sticky", top: 0, zIndex: 1000, background: "var(--background)" }}>
      <header style={{ padding: "40px 80px", borderBottom: "var(--border-light)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link
            href="/dashboard"
            className="display-hero"
            style={{
              fontSize: "clamp(2rem, 4vw, 4rem)",
              letterSpacing: "-0.05em",
              color: "var(--foreground)",
              textDecoration: "none",
            }}
          >
            VAT100
          </Link>

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
                transition: "border-color 0.2s ease",
                color: "var(--foreground)",
              }}
            >
              {isDrawerOpen ? "SLUIT" : "MENU"}
            </button>
          </div>
        </div>
      </header>

      {isDrawerOpen && (
        <div style={{ background: "var(--background)", borderBottom: "var(--border-light)" }}>
          <div style={{ padding: "40px 80px 80px 80px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "40px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <span className="label" style={{ marginBottom: 16 }}>Index</span>
              <Link href="/dashboard" className="display-title" style={{ fontSize: "2rem", textDecoration: "none", color: "var(--foreground)" }}>OVERZICHT</Link>
              <Link href="/dashboard/invoices" className="display-title" style={{ fontSize: "2rem", textDecoration: "none", color: "var(--foreground)", opacity: 0.4 }}>FACTUREN</Link>
              <Link href="/dashboard/clients" className="display-title" style={{ fontSize: "2rem", textDecoration: "none", color: "var(--foreground)", opacity: 0.4 }}>KLANTEN</Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <span className="label" style={{ marginBottom: 16 }}>Systemen</span>
              <Link href="/dashboard/bank" className="display-title" style={{ fontSize: "2rem", textDecoration: "none", color: "var(--foreground)", opacity: 0.4 }}>TRANSACTIES</Link>
              <Link href="/dashboard/tax" className="display-title" style={{ fontSize: "2rem", textDecoration: "none", color: "var(--foreground)", opacity: 0.4 }}>BELASTING</Link>
              <Link href="/dashboard/settings" className="display-title" style={{ fontSize: "2rem", textDecoration: "none", color: "var(--foreground)", opacity: 0.4 }}>INSTELLINGEN</Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-end" }}>
              <span className="label" style={{ marginBottom: 16 }}>Sessie</span>
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
                  color: "var(--foreground)",
                }}
              >
                VERLATEN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
