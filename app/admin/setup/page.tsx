import { getSystemStatus } from "@/features/admin/actions/system";
import { StatCard } from "@/components/ui/StatCard";
import { AdminStatePanel } from "../AdminStatePanel";

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

function getCronHealth(lastRun: string | null): { label: string; status: "healthy" | "degraded" | "down" } {
  if (!lastRun) return { label: "Nooit gedraaid", status: "down" };
  const hoursAgo = (Date.now() - new Date(lastRun).getTime()) / (1000 * 60 * 60);
  if (hoursAgo <= 25) return { label: "Gezond", status: "healthy" };
  if (hoursAgo <= 72) return { label: "Achterstallig", status: "degraded" };
  return { label: "Gestopt", status: "down" };
}

export default async function SystemStatusPage() {
  const result = await getSystemStatus();

  if (result.error || !result.data) {
    return (
      <AdminStatePanel
        eyebrow="Systeem"
        title="Systeemstatus kon niet worden geladen"
        description={result.error ?? "Onbekende fout"}
        actions={[{ href: "/admin", label: "Terug naar Command Center", variant: "secondary" }]}
      />
    );
  }

  const { health, database, activity, crons, eventBacklog } = result.data;
  const checks = health?.checks ?? {};
  const checkEntries = Object.entries(checks);

  const cronJobs = [
    { name: "Agents", schedule: "Dagelijks 03:00", lastRun: crons.lastAgentRun },
    { name: "Herinneringen", schedule: "Dagelijks 06:00", lastRun: crons.lastOverdueRun },
    { name: "Terugkerend", schedule: "Dagelijks", lastRun: crons.lastRecurringRun },
  ];

  return (
    <div className="admin-layout">
      {/* ─── Hero ─── */}
      <section className="admin-hero">
        <div className="admin-hero-copy">
          <p className="label">Operationeel Overzicht</p>
          <h1 className="admin-hero-title">Systeemstatus</h1>
          <p className="admin-hero-description">
            Service health, database counts, cron-monitoring en event backlog in één overzicht.
          </p>
        </div>
        <div className="admin-hero-meta">
          <div className="admin-meta-card">
            <span className="label">Algehele status</span>
            <p className="admin-meta-value">
              {health?.status === "healthy" ? "Operationeel" : health?.status === "degraded" ? "Verstoord" : "Onbekend"}
            </p>
            <p className="admin-meta-sub">
              {health ? formatDate(health.timestamp) : "Health endpoint niet bereikbaar"}
            </p>
          </div>
          <div className="admin-meta-card">
            <span className="label">Event backlog</span>
            <p className="admin-meta-value">{eventBacklog}</p>
            <p className="admin-meta-sub">
              {eventBacklog === 0 ? "Alle events verwerkt" : "Onverwerkte events"}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Service Health Grid ─── */}
      <section className="admin-panel admin-section">
        <div className="admin-panel-header">
          <div>
            <p className="label">Infrastructuur</p>
            <h2 className="admin-panel-title">Service Health</h2>
          </div>
        </div>
        {checkEntries.length === 0 ? (
          <div className="admin-empty-state">Health endpoint niet bereikbaar — services konden niet worden gecontroleerd.</div>
        ) : (
          <div className="admin-health-grid">
            {checkEntries.map(([key, check]) => (
              <div key={key} className="admin-health-card">
                <div className="admin-health-card-header">
                  <span
                    className="admin-health-dot"
                    data-status={check.status === "healthy" ? "healthy" : check.status === "degraded" ? "degraded" : "down"}
                  />
                  <span className="admin-health-name">{check.name}</span>
                </div>
                <div className="admin-health-card-body">
                  <span className="admin-health-latency">{check.latency_ms}ms</span>
                  <span className="admin-health-status">
                    {check.status === "healthy" ? "Operationeel" : check.status === "degraded" ? "Verstoord" : "Uitgevallen"}
                  </span>
                </div>
                {check.error && (
                  <p className="admin-health-error">{check.error}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Database Counts ─── */}
      <div className="admin-stat-grid">
        <StatCard label="Profielen" value={String(database.profiles)} numericValue={database.profiles} isCurrency={false} sub="Geregistreerde gebruikers" compact />
        <StatCard label="Facturen" value={String(database.invoices)} numericValue={database.invoices} isCurrency={false} sub="Totaal aangemaakt" compact />
        <StatCard label="Bonnen" value={String(database.receipts)} numericValue={database.receipts} isCurrency={false} sub="Totaal geüpload" compact />
        <StatCard label="Leads" value={String(database.leads)} numericValue={database.leads} isCurrency={false} sub="In de pipeline" compact />
        <StatCard label="Abonnementen" value={String(database.subscriptions)} numericValue={database.subscriptions} isCurrency={false} sub="Totaal aangemaakt" compact />
        <StatCard label="Audit log" value={String(database.auditLogEntries)} numericValue={database.auditLogEntries} isCurrency={false} sub="Logregels" compact />
      </div>

      {/* ─── Activiteit + Crons ─── */}
      <div className="admin-section-grid">
        {/* Activiteit */}
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <p className="label">Platformgebruik</p>
              <h2 className="admin-panel-title">Activiteit</h2>
            </div>
          </div>
          <div className="admin-growth-stats">
            <div className="admin-growth-stat-row">
              <span className="label">Actieve gebruikers (24u)</span>
              <span className="mono-amount" style={{ fontWeight: 600 }}>{activity.activeUsersLast24h}</span>
            </div>
            <div className="admin-growth-stat-row">
              <span className="label">Actieve gebruikers (7d)</span>
              <span className="mono-amount" style={{ fontWeight: 600 }}>{activity.activeUsersLast7d}</span>
            </div>
            <div className="admin-growth-stat-row">
              <span className="label">Facturen aangemaakt (24u)</span>
              <span className="mono-amount">{activity.invoicesLast24h}</span>
            </div>
            <div className="admin-growth-stat-row">
              <span className="label">Facturen aangemaakt (7d)</span>
              <span className="mono-amount">{activity.invoicesLast7d}</span>
            </div>
          </div>
        </section>

        {/* Cron Monitor */}
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <p className="label">Automatisering</p>
              <h2 className="admin-panel-title">Cron Jobs</h2>
            </div>
          </div>
          <div className="admin-cron-list">
            {cronJobs.map((job) => {
              const health = getCronHealth(job.lastRun);
              return (
                <div key={job.name} className="admin-cron-row">
                  <div className="admin-cron-info">
                    <div className="admin-cron-name-row">
                      <span
                        className="admin-health-dot"
                        data-status={health.status}
                      />
                      <span className="admin-cron-name">{job.name}</span>
                    </div>
                    <span className="admin-cron-schedule">{job.schedule}</span>
                  </div>
                  <div className="admin-cron-meta">
                    <span className="admin-cron-last-run">
                      {job.lastRun ? formatDate(job.lastRun) : "—"}
                    </span>
                    <span
                      className="admin-cron-badge"
                      data-status={health.status}
                    >
                      {health.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
