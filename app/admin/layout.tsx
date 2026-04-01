import { requireAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminNav } from "./AdminNav";
import "./admin.css";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAdmin();
  if (auth.error) redirect("/dashboard");

  return (
    <div className="admin-shell">
      <div style={{ display: "flex", flex: 1 }}>
        {/* Vertical Command Sidebar */}
        <aside style={{ 
          width: "280px", 
          borderRight: "1px solid var(--color-black)",
          height: "100vh",
          position: "sticky",
          top: 0,
          backgroundColor: "white",
          display: "flex",
          flexDirection: "column"
        }}>
          <AdminNav />
        </aside>

        {/* Main Command Center */}
        <main id="main" style={{ flex: 1, backgroundColor: "var(--background)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
