import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/layout/DashboardNav";
import { DashboardTransition } from "@/components/layout/DashboardTransition";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { getUnreadCount } from "@/features/chat/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch profile and unread count in parallel
  const [profileResult, unreadResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("studio_name")
      .eq("id", user.id)
      .single(),
    getUnreadCount(),
  ]);

  return (
    <div className="dashboard-shell">
      <a href="#main" className="skip-to-content">
        Skip to content
      </a>
      <DashboardNav
        studioName={profileResult.data?.studio_name ?? undefined}
        unreadMessages={unreadResult.data ?? 0}
      />
      <DashboardTransition>
        <main id="main" className="dashboard-content">
          <Breadcrumb />
          {children}
        </main>
      </DashboardTransition>
      <MobileBottomNav />
    </div>
  );
}
