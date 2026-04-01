import { requireAdmin } from "@/lib/supabase/server";
import { DashboardTransition } from "@/components/layout/DashboardTransition";
import { AdminNav } from "./AdminNav";
import { AdminStatePanel } from "./AdminStatePanel";
import "./admin.css";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAdmin();
  const content = auth.error ? (
    <AdminStatePanel
      eyebrow={auth.status === 401 ? "Authenticatie" : auth.status === 403 ? "Admin toegang" : "Systeemstatus"}
      title={
        auth.status === 401
          ? "Log in om admin te openen"
          : auth.status === 403
            ? "Je hebt geen toegang tot admin"
            : "Admin is tijdelijk niet beschikbaar"
      }
      description={auth.error}
      actions={
        auth.status === 401
          ? [
              { href: "/login", label: "Naar login" },
              { href: "/dashboard", label: "Terug naar dashboard", variant: "secondary" },
            ]
          : [{ href: "/dashboard", label: "Terug naar dashboard", variant: "secondary" }]
      }
    />
  ) : (
    children
  );

  return (
    <div className="dashboard-shell">
      <a href="#main" className="skip-to-content">
        Ga naar inhoud
      </a>
      <AdminNav />
      <DashboardTransition>
        <main id="main" className="dashboard-content">
          {content}
        </main>
      </DashboardTransition>
    </div>
  );
}
