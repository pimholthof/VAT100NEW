"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DashboardNav({
  studioName,
}: {
  studioName?: string;
}) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="dashboard-nav" style={{ padding: "40px 0" }}>
      <div className="dashboard-nav-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {/* Logo — The only anchor */}
        <Link
          href="/dashboard"
          style={{
            fontFamily: "var(--font-geist), sans-serif",
            fontSize: "14px",
            fontWeight: 400,
            letterSpacing: "0.4em",
            textDecoration: "none",
            color: "var(--foreground)",
            textTransform: "uppercase",
            opacity: 0.8
          }}
        >
          VAT100
        </Link>

        {/* Minimal Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <span className="label" style={{ opacity: 0.2 }}>{studioName}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="label"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              opacity: 0.2,
              padding: 0,
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
