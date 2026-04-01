import { requireAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminNav } from "./AdminNav";
import { DashboardTransition } from "@/components/layout/DashboardTransition";
import "./admin.css";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAdmin();
  if (auth.error) redirect("/dashboard");

  return (
    <div className="dashboard-shell">
      <a href="#main" className="skip-to-content">
        Naar inhoud
      </a>
      <AdminNav />
      <DashboardTransition>
        <main id="main" className="dashboard-content">
          {children}
        </main>
      </DashboardTransition>
    </div>
  );
}
