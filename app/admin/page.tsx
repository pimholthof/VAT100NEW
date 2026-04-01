import { getLeads, getPlatformStats } from "@/features/admin/actions";
import { getControllerAuditData } from "@/features/dashboard/actions";
import { LeadPipeline } from "@/features/admin/LeadPipeline";
import StrategicBriefing from "@/features/admin/StrategicBriefing";
import RetentionDashboard from "@/features/admin/RetentionDashboard";
import { TaxAuditCard } from "@/features/dashboard/TaxAuditCard";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function AdminDashboardPage() {
  // Fetch leads, stats and audit in parallel for speed
  const [leadsResult, statsResult, auditResult] = await Promise.all([
    getLeads(),
    getPlatformStats(),
    getControllerAuditData(),
  ]);

  if (leadsResult.error) {
    return (
      <div style={{ padding: "40px" }}>
        <h1 className="display-hero">Hub Error</h1>
        <p style={{ opacity: 0.5 }}>{leadsResult.error}</p>
      </div>
    );
  }

  const leads = leadsResult.data || [];
  const stats = statsResult.data;
  const audit = auditResult.data;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", paddingBottom: "100px" }}>
      {/* Editorial Header */}
      <header className="admin-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 className="display-hero" style={{ margin: 0, fontSize: "4rem", lineHeight: 0.9 }}>
              PIPELINE
            </h1>
            <p className="label" style={{ marginTop: "12px", opacity: 0.4 }}>
              VOORTGANG VAN {leads.length} LEADS & PROSPECTS
            </p>
          </div>
          
          {/* Quick Hub Stats */}
          {stats && (
            <div style={{ display: "flex", gap: "48px", borderLeft: "1px solid rgba(0,0,0,0.1)", paddingLeft: "48px" }}>
              <div>
                <span className="label" style={{ opacity: 0.4 }}>ACTIEVE GEBRUIKERS</span>
                <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{stats.activeUsers}</div>
              </div>
              <div>
                <span className="label" style={{ opacity: 0.4 }}>OMZET PLATFORM</span>
                <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>€{stats.totalRevenue.toLocaleString("nl-NL")}</div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* The Sales Pipeline */}
      <div style={{ marginBottom: "80px" }}>
        <LeadPipeline initialLeads={leads} />
      </div>

      {/* Controller Section: Tax Auditor */}
      {audit && (
        <div style={{ marginBottom: "80px", maxWidth: "800px" }}>
          <h2 className="text-[10px] font-black uppercase tracking-widest mb-6 opacity-40">FISCAL CONTROLLER // CEO ONLY</h2>
          <TaxAuditCard 
            score={audit.score}
            findingsCount={audit.findingsCount}
            status={audit.status}
            quarter={audit.quarter}
            year={audit.year}
          />
        </div>
      )}

      {/* Strategic Advisor (CFO) */}
      <div style={{ marginBottom: "80px" }}>
        <StrategicBriefing />
      </div>

      {/* The Retention Radar */}
      <RetentionDashboard />
    </div>
  );
}
