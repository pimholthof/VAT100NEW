import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/layout/DashboardNav";
import { DashboardTransition } from "@/components/layout/DashboardTransition";

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
      <a
        href="#main"
        className="skip-to-content"
        style={{
          position: "absolute",
          left: "-9999px",
          top: "auto",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
        onFocus={(e) => {
          e.currentTarget.style.position = "fixed";
          e.currentTarget.style.left = "16px";
          e.currentTarget.style.top = "16px";
          e.currentTarget.style.width = "auto";
          e.currentTarget.style.height = "auto";
          e.currentTarget.style.overflow = "visible";
          e.currentTarget.style.zIndex = "10000";
          e.currentTarget.style.background = "var(--foreground)";
          e.currentTarget.style.color = "var(--background)";
          e.currentTarget.style.padding = "8px 16px";
          e.currentTarget.style.fontSize = "14px";
        }}
        onBlur={(e) => {
          e.currentTarget.style.position = "absolute";
          e.currentTarget.style.left = "-9999px";
          e.currentTarget.style.width = "1px";
          e.currentTarget.style.height = "1px";
          e.currentTarget.style.overflow = "hidden";
        }}
      >
        Ga naar inhoud
      </a>
      <DashboardNav
        studioName={profile?.studio_name ?? undefined}
      />
      <DashboardTransition>
        <main id="main" className="dashboard-content">{children}</main>
      </DashboardTransition>
    </div>
  );
}
