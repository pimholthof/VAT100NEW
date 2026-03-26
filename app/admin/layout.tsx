import { requireAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminNav } from "./AdminNav";

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
        Ga naar inhoud
      </a>
      <AdminNav />
      <main id="main" className="dashboard-content">
        {children}
      </main>
    </div>
  );
}
