import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/layout/DashboardNav";

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
    .select("studio_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="dashboard-shell">
      <DashboardNav studioName={profile?.studio_name ?? undefined} />
      <main className="dashboard-content">{children}</main>
    </div>
  );
}
