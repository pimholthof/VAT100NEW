"use client";

import { useQuery } from "@tanstack/react-query";
import { getSystemStatus } from "@/features/admin/actions/system";
import { PageHeader, StatCard, SkeletonCard } from "@/components/ui";
import { formatDateLong } from "@/lib/format";

const STATUS_COLORS: Record<string, string> = {
  healthy: "#16a34a",
  degraded: "#f59e0b",
  down: "#dc2626",
};

function StatusDot({ status }: { status: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        backgroundColor: STATUS_COLORS[status] ?? "#94a3b8",
        marginRight: 8,
      }}
    />
  );
}

export default function AdminSystemPage() {
  const { data: result, isLoading, refetch } = useQuery({
    queryKey: ["admin-system-status"],
    queryFn: getSystemStatus,
    refetchInterval: 30_000, // Auto-refresh every 30s
  });

  const status = result?.data;

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Systeem Status" backHref="/admin" backLabel="Beheer" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div>
        <PageHeader title="Systeem Status" backHref="/admin" backLabel="Beheer" />
        <p className="empty-state">Kon systeemstatus niet laden.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Systeem Status" backHref="/admin" backLabel="Beheer" />

      {/* Service Health */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: "var(--text-heading-sm)", fontWeight: 600 }}>Service Health</h2>
          <button
            onClick={() => refetch()}
            style={{
              background: "none",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 6,
              padding: "4px 12px",
              cursor: "pointer",
              fontSize: "var(--text-body-sm)",
            }}
          >
            Ververs
          </button>
        </div>

        {status.health ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            {Object.values(status.health.checks).map((check) => (
              <div
                key={check.name}
                style={{
                  padding: 20,
                  borderRadius: 12,
                  border: "0.5px solid rgba(0,0,0,0.05)",
                  background: "rgba(255,255,255,0.85)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                  <StatusDot status={check.status} />
                  <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{check.name}</span>
                </div>
                <p className="label" style={{ margin: 0 }}>
                  {check.status === "healthy" ? "Operationeel" : check.status === "degraded" ? "Beperkt" : "Offline"}
                </p>
                <p className="label" style={{ margin: 0, opacity: 0.5 }}>
                  {check.latency_ms}ms
                </p>
                {check.error && (
                  <p style={{ margin: "4px 0 0", fontSize: "var(--text-body-sm)", color: "#dc2626" }}>
                    {check.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="label">Health endpoint niet bereikbaar</p>
        )}
      </section>

      {/* Database Stats */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: "var(--text-heading-sm)", fontWeight: 600, marginBottom: 16 }}>Database</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          <StatCard label="Profielen" value={status.database.profiles} />
          <StatCard label="Facturen" value={status.database.invoices} />
          <StatCard label="Bonnetjes" value={status.database.receipts} />
          <StatCard label="Leads" value={status.database.leads} />
          <StatCard label="Abonnementen" value={status.database.subscriptions} />
          <StatCard label="Audit log" value={status.database.auditLogEntries} />
        </div>
      </section>

      {/* Activity */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: "var(--text-heading-sm)", fontWeight: 600, marginBottom: 16 }}>Activiteit</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <StatCard label="Actieve gebruikers (24u)" value={status.activity.activeUsersLast24h} />
          <StatCard label="Actieve gebruikers (7d)" value={status.activity.activeUsersLast7d} />
          <StatCard label="Facturen (24u)" value={status.activity.invoicesLast24h} />
          <StatCard label="Facturen (7d)" value={status.activity.invoicesLast7d} />
        </div>
      </section>

      {/* Cron Jobs */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: "var(--text-heading-sm)", fontWeight: 600, marginBottom: 16 }}>Cron Jobs</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <div style={{ padding: 20, borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.85)" }}>
            <p style={{ fontWeight: 600, margin: "0 0 4px" }}>AI Agents (dagelijks 03:00)</p>
            <p className="label" style={{ margin: 0 }}>
              Laatste run: {status.crons.lastAgentRun ? formatDateLong(status.crons.lastAgentRun) : "Nooit"}
            </p>
          </div>
          <div style={{ padding: 20, borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.85)" }}>
            <p style={{ fontWeight: 600, margin: "0 0 4px" }}>Betalingsherinneringen (dagelijks 06:00)</p>
            <p className="label" style={{ margin: 0 }}>
              Laatste run: {status.crons.lastOverdueRun ? formatDateLong(status.crons.lastOverdueRun) : "Nooit"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
