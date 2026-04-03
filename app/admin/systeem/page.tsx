"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSystemStatus } from "@/features/admin/actions/system";
import { getSystemSettings, updateSystemSetting } from "@/features/admin/actions/settings";
import { getAuditLog } from "@/features/admin/actions/audit";
import { PageHeader, ErrorMessage, TableWrapper, Th, Td, Select, ButtonSecondary, SkeletonTable } from "@/components/ui";
import { StatCard } from "@/components/ui/StatCard";
import { formatDateLong } from "@/lib/format";
import { SysteemTabs } from "./SysteemTabs";

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

// ─── Settings ───

const SETTING_LABELS: Record<string, { label: string; type: "boolean" | "number" | "text" }> = {
  "platform.name": { label: "Platform naam", type: "text" },
  "platform.registration_open": { label: "Registratie open", type: "boolean" },
  "platform.maintenance_mode": { label: "Onderhoudsmodus", type: "boolean" },
  "platform.default_vat_rate": { label: "Standaard BTW-tarief (%)", type: "number" },
  "notifications.welcome_email": { label: "Welkomstemails versturen", type: "boolean" },
  "notifications.overdue_reminders": { label: "Automatische betalingsherinneringen", type: "boolean" },
  "limits.max_free_users": { label: "Max. gratis gebruikers (0 = onbeperkt)", type: "number" },
};

function SettingRow({
  settingKey,
  value,
  description,
  onUpdate,
  isUpdating,
}: {
  settingKey: string;
  value: unknown;
  description: string | null;
  onUpdate: (key: string, value: unknown) => void;
  isUpdating: boolean;
}) {
  const config = SETTING_LABELS[settingKey] ?? { label: settingKey, type: "text" };
  const currentValue = typeof value === "string" ? value : JSON.stringify(value);

  if (config.type === "boolean") {
    const boolValue = value === true || value === "true";
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "0.5px solid rgba(0,0,0,0.05)" }}>
        <div>
          <p style={{ fontWeight: 600, margin: 0 }}>{config.label}</p>
          {description && <p className="label" style={{ margin: "4px 0 0" }}>{description}</p>}
        </div>
        <button
          onClick={() => onUpdate(settingKey, !boolValue)}
          disabled={isUpdating}
          style={{ width: 48, height: 28, borderRadius: 14, border: "none", cursor: "pointer", background: boolValue ? "#000" : "rgba(0,0,0,0.1)", position: "relative", transition: "background 0.2s" }}
        >
          <span style={{ position: "absolute", top: 3, left: boolValue ? 23 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "0.5px solid rgba(0,0,0,0.05)" }}>
      <div>
        <p style={{ fontWeight: 600, margin: 0 }}>{config.label}</p>
        {description && <p className="label" style={{ margin: "4px 0 0" }}>{description}</p>}
      </div>
      <input
        type={config.type === "number" ? "number" : "text"}
        defaultValue={currentValue.replace(/^"|"$/g, "")}
        onBlur={(e) => {
          const newValue = config.type === "number" ? Number(e.target.value) : e.target.value;
          if (String(newValue) !== currentValue.replace(/^"|"$/g, "")) onUpdate(settingKey, newValue);
        }}
        disabled={isUpdating}
        style={{ width: 200, padding: "8px 12px", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 8, fontSize: "var(--text-body)", textAlign: "right" }}
      />
    </div>
  );
}

// ─── Audit Log ───

const ACTION_LABELS: Record<string, string> = {
  "user.suspend": "Gebruiker geblokkeerd",
  "user.reactivate": "Gebruiker geactiveerd",
  "user.delete": "Gebruiker verwijderd",
  "user.anonymize": "Gebruiker geanonimiseerd",
  "customer.profile_update": "Profiel bijgewerkt",
  "customer.bulk_action": "Bulk actie",
  "invoice.status_change": "Factuurstatus gewijzigd",
  "lead.stage_change": "Lead fase gewijzigd",
  "lead.plan_change": "Lead plan gewijzigd",
  "lead.provision": "Account aangemaakt",
  "lead.task_toggle": "Taak gewijzigd",
  "lead.payment_initiated": "Betaling gestart",
  "settings.update": "Instelling gewijzigd",
  "impersonation.start": "Impersonatie gestart",
  "data.export": "Data geëxporteerd",
};

const TARGET_LABELS: Record<string, string> = {
  user: "Gebruiker",
  customer: "Klant",
  invoice: "Factuur",
  lead: "Lead",
  setting: "Instelling",
  system: "Systeem",
};

// ─── Main Component ───

export default function SysteemPage() {
  return (
    <div>
      <PageHeader title="Systeem" backHref="/admin" backLabel="Command Center" />
      <SysteemTabs>
        <StatusTab />
        <InstellingenTab />
        <AuditLogTab />
      </SysteemTabs>
    </div>
  );
}

function StatusTab() {
  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-system-status"],
    queryFn: getSystemStatus,
  });

  if (isLoading) return <div className="admin-table-shell"><div className="admin-empty-state">Laden...</div></div>;

  if (result?.error || !result?.data) {
    return <div className="admin-panel"><div className="admin-empty-state">Systeemstatus kon niet worden geladen: {result?.error ?? "Onbekende fout"}</div></div>;
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
      {/* Overall status + Event backlog */}
      <div className="admin-hero-meta" style={{ marginBottom: 24 }}>
        <div className="admin-meta-card">
          <span className="label">Algehele status</span>
          <p className="admin-meta-value">
            {health?.status === "healthy" ? "Operationeel" : health?.status === "degraded" ? "Verstoord" : "Onbekend"}
          </p>
          <p className="admin-meta-sub">{health ? formatDate(health.timestamp) : "Health endpoint niet bereikbaar"}</p>
        </div>
        <div className="admin-meta-card">
          <span className="label">Event backlog</span>
          <p className="admin-meta-value">{eventBacklog}</p>
          <p className="admin-meta-sub">{eventBacklog === 0 ? "Alle events verwerkt" : "Onverwerkte events"}</p>
        </div>
      </div>

      {/* Service Health */}
      <section className="admin-panel" style={{ marginBottom: 24 }}>
        <div className="admin-panel-header">
          <div><p className="label">Infrastructuur</p><h2 className="admin-panel-title">Service Health</h2></div>
        </div>
        {checkEntries.length === 0 ? (
          <div className="admin-empty-state">Health endpoint niet bereikbaar.</div>
        ) : (
          <div className="admin-health-grid">
            {checkEntries.map(([key, check]) => (
              <div key={key} className="admin-health-card">
                <div className="admin-health-card-header">
                  <span className="admin-health-dot" data-status={check.status === "healthy" ? "healthy" : check.status === "degraded" ? "degraded" : "down"} />
                  <span className="admin-health-name">{check.name}</span>
                </div>
                <div className="admin-health-card-body">
                  <span className="admin-health-latency">{check.latency_ms}ms</span>
                  <span className="admin-health-status">{check.status === "healthy" ? "Operationeel" : check.status === "degraded" ? "Verstoord" : "Uitgevallen"}</span>
                </div>
                {check.error && <p className="admin-health-error">{check.error}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Database Counts */}
      <div className="admin-stat-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Profielen" value={String(database.profiles)} numericValue={database.profiles} isCurrency={false} sub="Geregistreerde gebruikers" compact />
        <StatCard label="Facturen" value={String(database.invoices)} numericValue={database.invoices} isCurrency={false} sub="Totaal aangemaakt" compact />
        <StatCard label="Bonnen" value={String(database.receipts)} numericValue={database.receipts} isCurrency={false} sub="Totaal geüpload" compact />
        <StatCard label="Leads" value={String(database.leads)} numericValue={database.leads} isCurrency={false} sub="In de pipeline" compact />
        <StatCard label="Abonnementen" value={String(database.subscriptions)} numericValue={database.subscriptions} isCurrency={false} sub="Totaal aangemaakt" compact />
        <StatCard label="Audit log" value={String(database.auditLogEntries)} numericValue={database.auditLogEntries} isCurrency={false} sub="Logregels" compact />
      </div>

      {/* Activity + Crons */}
      <div className="admin-section-grid">
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div><p className="label">Platformgebruik</p><h2 className="admin-panel-title">Activiteit</h2></div>
          </div>
          <div className="admin-growth-stats">
            <div className="admin-growth-stat-row"><span className="label">Actieve gebruikers (24u)</span><span className="mono-amount" style={{ fontWeight: 600 }}>{activity.activeUsersLast24h}</span></div>
            <div className="admin-growth-stat-row"><span className="label">Actieve gebruikers (7d)</span><span className="mono-amount" style={{ fontWeight: 600 }}>{activity.activeUsersLast7d}</span></div>
            <div className="admin-growth-stat-row"><span className="label">Facturen aangemaakt (24u)</span><span className="mono-amount">{activity.invoicesLast24h}</span></div>
            <div className="admin-growth-stat-row"><span className="label">Facturen aangemaakt (7d)</span><span className="mono-amount">{activity.invoicesLast7d}</span></div>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div><p className="label">Automatisering</p><h2 className="admin-panel-title">Cron Jobs</h2></div>
          </div>
          <div className="admin-cron-list">
            {cronJobs.map((job) => {
              const h = getCronHealth(job.lastRun);
              return (
                <div key={job.name} className="admin-cron-row">
                  <div className="admin-cron-info">
                    <div className="admin-cron-name-row">
                      <span className="admin-health-dot" data-status={h.status} />
                      <span className="admin-cron-name">{job.name}</span>
                    </div>
                    <span className="admin-cron-schedule">{job.schedule}</span>
                  </div>
                  <div className="admin-cron-meta">
                    <span className="admin-cron-last-run">{job.lastRun ? formatDate(job.lastRun) : "\u2014"}</span>
                    <span className="admin-cron-badge" data-status={h.status}>{h.label}</span>
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

function InstellingenTab() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-system-settings"],
    queryFn: getSystemSettings,
  });

  const mutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => updateSystemSetting(key, value),
    onSuccess: (r) => {
      if (r.error) setError(r.error);
      else { queryClient.invalidateQueries({ queryKey: ["admin-system-settings"] }); setError(null); }
    },
  });

  const settings = result?.data ?? [];

  return (
    <div>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {isLoading ? (
        <p className="label">Laden...</p>
      ) : settings.length === 0 ? (
        <p className="empty-state">Geen instellingen gevonden</p>
      ) : (
        <div style={{ maxWidth: 700, padding: 24, borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.85)" }}>
          {settings.map((setting) => (
            <SettingRow
              key={setting.key}
              settingKey={setting.key}
              value={setting.value}
              description={setting.description}
              onUpdate={(key, value) => mutation.mutate({ key, value })}
              isUpdating={mutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AuditLogTab() {
  const [actionFilter, setActionFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-audit-log", actionFilter, targetFilter, page],
    queryFn: () => getAuditLog({ action: actionFilter, targetType: targetFilter, page, pageSize }),
  });

  const entries = result?.data?.entries ?? [];
  const total = result?.data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        <Select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} style={{ maxWidth: 260 }}>
          <option value="all">Alle acties</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        <Select value={targetFilter} onChange={(e) => { setTargetFilter(e.target.value); setPage(1); }} style={{ maxWidth: 200 }}>
          <option value="all">Alle typen</option>
          {Object.entries(TARGET_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </div>

      <p className="label" style={{ marginBottom: 16 }}>{total} log{total !== 1 ? "regels" : "regel"}</p>

      {isLoading ? (
        <SkeletonTable columns="0.5fr 1.5fr 1.5fr 1fr 1fr 1.5fr" rows={10} headerWidths={[30, 60, 60, 50, 50, 60]} bodyWidths={[20, 50, 50, 40, 40, 50]} />
      ) : entries.length === 0 ? (
        <p className="empty-state">Nog geen audit log entries</p>
      ) : (
        <TableWrapper>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr><Th>Datum</Th><Th>Admin</Th><Th>Actie</Th><Th>Type</Th><Th>Target ID</Th><Th>Details</Th></tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <Td><span className="label">{formatDateLong(entry.created_at)}</span></Td>
                  <Td style={{ fontWeight: 500 }}>{entry.admin_name}</Td>
                  <Td>
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, background: "rgba(0,0,0,0.04)", fontSize: "var(--text-body-sm)", fontWeight: 500 }}>
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </span>
                  </Td>
                  <Td><span className="label">{TARGET_LABELS[entry.target_type] ?? entry.target_type}</span></Td>
                  <Td style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-body-sm)", opacity: 0.6 }}>{entry.target_id.substring(0, 8)}...</Td>
                  <Td style={{ fontSize: "var(--text-body-sm)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {Object.keys(entry.metadata).length > 0 ? JSON.stringify(entry.metadata) : "\u2014"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrapper>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 32 }}>
          <ButtonSecondary onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Vorige</ButtonSecondary>
          <span className="label" style={{ padding: "8px 16px" }}>{page} / {totalPages}</span>
          <ButtonSecondary onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Volgende</ButtonSecondary>
        </div>
      )}
    </div>
  );
}
