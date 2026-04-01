import { getLeadActivities, getLeadDetail, getLeadTasks, initializeLeadTasks } from "@/features/admin/actions";
import { getPlans } from "@/features/subscriptions/actions";
import { LeadDossier } from "@/features/admin/LeadDossier";
import Link from "next/link";
import { notFound } from "next/navigation";

interface LeadDetailPageProps {
  params: {
    id: string;
  };
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = params;

  // Fetch lead data and plans
  const [leadResult, plans] = await Promise.all([
    getLeadDetail(id),
    getPlans()
  ]);

  if (leadResult.error || !leadResult.data) {
    return notFound();
  }

  const lead = leadResult.data;

  // Fetch activities and tasks
  let [activitiesResult, tasksResult] = await Promise.all([
    getLeadActivities(id),
    getLeadTasks(id),
  ]);

  // Lazy Initialization of tasks if none exist
  if (tasksResult.data && tasksResult.data.length === 0) {
    await initializeLeadTasks(id);
    // Refetch tasks after initialization
    tasksResult = await getLeadTasks(id);
  }

  const activities = activitiesResult.data || [];
  const tasks = tasksResult.data || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "white" }}>
      {/* Editorial Header (Sub-level) */}
      <header className="admin-header" style={{ padding: "16px var(--page-gutter)", display: "flex", alignItems: "center", gap: "24px" }}>
        <Link 
          href="/admin" 
          className="label-strong" 
          style={{ textDecoration: "none", color: "var(--color-black)", fontSize: "11px", display: "flex", alignItems: "center", gap: "8px" }}
        >
          &larr; PIPELINE
        </Link>
        <div style={{ height: "24px", width: "1px", backgroundColor: "rgba(0,0,0,0.1)" }} />
        <div className="label-strong" style={{ fontSize: "11px", letterSpacing: "0.1em" }}>
          DOSSIER: {lead.id.substring(0, 8).toUpperCase()}
        </div>
      </header>

      {/* The One-View Dossier */}
      <LeadDossier 
        lead={lead} 
        activities={activities} 
        tasks={tasks} 
        plans={plans}
      />
    </div>
  );
}
