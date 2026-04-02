import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/layout/DashboardNav";
import { DashboardTransition } from "@/components/layout/DashboardTransition";
import { ChatWidget } from "@/features/chat/ChatWidget";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch profile for studio name
  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="dashboard-shell">
      <a href="#main" className="skip-to-content">
        Skip to content
      </a>
      <DashboardNav
        studioName={profile?.studio_name ?? undefined}
      />
      <DashboardTransition>
        <main id="main" className="dashboard-content">
          <Breadcrumb />
          {children}
        </main>
      </DashboardTransition>
      <ChatWidget />
      <MobileBottomNav />
    </div>
  );
}
