import { getLeads, getPlatformStats } from "@/features/admin/actions";
import { getControllerAuditData } from "@/features/dashboard/actions";
import { LeadPipeline } from "@/features/admin/LeadPipeline";
import StrategicBriefing from "@/features/admin/StrategicBriefing";
import RetentionDashboard from "@/features/admin/RetentionDashboard";
import { TaxAuditCard } from "@/features/dashboard/TaxAuditCard";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency } from "@/lib/format";
import { PipelineTabs } from "./PipelineTabs";

export default async function AdminPipelinePage() {
  const [leadsResult, statsResult, auditResult] = await Promise.all([
    getLeads(),
    getPlatformStats(),
    getControllerAuditData(),
  ]);

  if (leadsResult.error) {
    return (
      <div>
        <h1 className="display-title">Fout</h1>
        <p style={{ opacity: 0.5 }}>{leadsResult.error}</p>
      </div>
    );
  }

  const leads = leadsResult.data || [];
  const stats = statsResult.data;
  const audit = auditResult.data;

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

        {/* Platform statistieken */}
        {stats && (
          <div className="stat-cards-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <StatCard
              label="Actieve gebruikers"
              value={String(stats.activeUsers)}
              numericValue={stats.activeUsers}
              isCurrency={false}
            />
            <StatCard
              label="Totale omzet"
              value={formatCurrency(stats.totalRevenue)}
              numericValue={stats.totalRevenue}
            />
            <StatCard
              label="Totaal gebruikers"
              value={String(stats.totalUsers)}
              numericValue={stats.totalUsers}
              isCurrency={false}
            />
            <StatCard
              label="Nieuw deze maand"
              value={String(stats.newUsersThisMonth)}
              numericValue={stats.newUsersThisMonth}
              isCurrency={false}
            />
          </div>
        )}

        {/* Sales Pipeline */}
        <div>
          <LeadPipeline initialLeads={leads} />
        </div>

        {/* Fiscale Controle */}
        {audit && (
          <div style={{ maxWidth: "800px" }}>
            <h2 className="label" style={{ marginBottom: "24px" }}>
              Fiscale controle
            </h2>
            <TaxAuditCard
              score={audit.score}
              findingsCount={audit.findingsCount}
              status={audit.status}
              quarter={audit.quarter}
              year={audit.year}
            />
          </div>
        )}

        {/* Strategisch Overzicht */}
        <StrategicBriefing />

        {/* Retentie Radar */}
        <RetentionDashboard />
      </div>
    </PipelineTabs>
  );
}
