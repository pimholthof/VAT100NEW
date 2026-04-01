import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingChecklist } from "./OnboardingChecklist";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tasks } = await supabase
    .from("onboarding_tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (!tasks || tasks.length === 0) redirect("/dashboard");

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 48 }}>
        <h1 className="display-title" style={{ marginBottom: 12 }}>
          Welkom bij VAT100
        </h1>
        <p style={{ fontSize: "var(--text-body-lg)", opacity: 0.5, lineHeight: 1.5 }}>
          {completedCount === tasks.length
            ? "Je bent helemaal klaar. Succes met je administratie!"
            : `${completedCount} van ${tasks.length} stappen voltooid`}
        </p>
      </div>

      <OnboardingChecklist tasks={tasks} />
    </div>
  );
}
