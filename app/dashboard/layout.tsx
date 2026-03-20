import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/layout/DashboardNav";
import { DashboardFooter } from "@/components/layout/DashboardFooter";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_name, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="dashboard-shell">
      <a href="#main-content" className="skip-link">
        Ga naar inhoud
      </a>
      <DashboardNav
        studioName={profile?.studio_name ?? undefined}
        isAdvisor={profile?.role === "advisor"}
      />
      <main id="main-content" className="dashboard-content">{children}</main>
      <DashboardFooter />
    </div>
  );
}
