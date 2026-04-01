"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AdminNav() {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const navLinks = [
    { href: "/admin", label: "Sales Pipeline", icon: "📊" },
    { href: "/admin/audit", label: "Fiscale Controle", icon: "⚖️" },
    { href: "/admin/users", label: "Gebruikers", icon: "👥" },
    { href: "/admin/waitlist", label: "Wachtlijst", icon: "⏳" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "40px 24px" }}>
      {/* Branding */}
      <div style={{ marginBottom: "64px" }}>
        <Link href="/admin" className="display-hero" style={{ fontSize: "2rem", textDecoration: "none", color: "var(--color-black)" }}>
          VAT100
        </Link>
        <div style={{ 
          marginTop: "8px",
          display: "inline-block",
          background: "var(--color-accent)",
          color: "white",
          padding: "2px 8px",
          fontSize: "9px",
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase"
        }}>
          Founder Hub
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px" }}>
        <span className="label" style={{ opacity: 0.3, marginBottom: "-8px" }}>Beheer</span>
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link 
              key={link.href} 
              href={link.href} 
              className="drawer-link"
              style={{ 
                fontSize: "1.25rem",
                opacity: isActive ? 1 : 0.4,
                textDecoration: "none",
                color: "var(--color-black)",
                fontWeight: isActive ? 700 : 400,
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}
            >
              <span style={{ fontSize: "1rem" }}>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.1)", paddingTop: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <Link href="/dashboard" className="label-strong" style={{ textDecoration: "none", color: "var(--color-black)", opacity: 0.6 }}>
          TERUG NAAR DASHBOARD
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="drawer-logout"
          style={{ textAlign: "left", padding: 0 }}
        >
          UITLOGGEN
        </button>
      </div>
    </div>
  );
}
