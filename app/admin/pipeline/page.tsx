import { getLeads } from "@/features/admin/actions";
import { LeadPipeline } from "@/features/admin/LeadPipeline";
import { PipelineTabs } from "./PipelineTabs";

export default async function AdminPipelinePage() {
  const leadsResult = await getLeads();

  if (leadsResult.error) {
    return (
      <div>
        <h1 className="display-title">Fout</h1>
        <p style={{ opacity: 0.5 }}>{leadsResult.error}</p>
      </div>
    );
  }

  const leads = leadsResult.data || [];

  return (
    <PipelineTabs>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-section)" }}>
        {/* Header */}
        <div>
          <h1 className="display-title" style={{ marginBottom: "12px" }}>
            Pipeline
          </h1>
          <p className="label" style={{ marginBottom: 0 }}>
            Voortgang van {leads.length} leads en prospects
          </p>
        </div>

        {/* Sales Pipeline */}
        <div>
          <LeadPipeline initialLeads={leads} />
        </div>
      </div>
    </PipelineTabs>
  );
}
