import { getAdminDashboardData } from "@/features/admin/actions";
import { StatCard } from "@/components/ui/StatCard";
import { AdminAlertList } from "@/features/admin/AdminAlertList";
import { AdminMiniTable } from "@/features/admin/AdminMiniTable";
import { AdminQuickActions } from "@/features/admin/AdminQuickActions";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function AdminDashboardPage() {
  const result = await getAdminDashboardData();

  if (result.error) {
    return (
      <div>
        <h1 className="display-title">Fout</h1>
        <p style={{ opacity: 0.5 }}>{result.error}</p>
      </div>
    );
  }

  const { kpis, alerts, recentLeads, recentCustomers, quickActionsData, lastUpdated } = result.data!;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-section)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="display-title" style={{ marginBottom: 8 }}>
            Platform in beeld
          </h1>
          <p className="label" style={{ margin: 0, opacity: 0.4 }}>
            Operationeel overzicht
          </p>
        </div>
        <span className="label" style={{ opacity: 0.3 }}>
          Bijgewerkt: {new Date(lastUpdated).toLocaleString("nl-NL", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="stat-cards-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <StatCard
          label="Klanten"
          value={String(kpis.totalCustomers)}
          numericValue={kpis.totalCustomers}
          isCurrency={false}
        />
        <StatCard
          label="Actieve klanten"
          value={String(kpis.activeCustomers)}
          numericValue={kpis.activeCustomers}
          isCurrency={false}
          sub={`van ${kpis.totalCustomers} totaal`}
        />
        <StatCard
          label="Leads"
          value={String(kpis.totalLeads)}
          numericValue={kpis.totalLeads}
          isCurrency={false}
        />
        <StatCard
          label="Omzet"
          value={formatCurrency(kpis.totalRevenue)}
          numericValue={kpis.totalRevenue}
        />
        <StatCard
          label="Openstaand"
          value={formatCurrency(kpis.openAmount)}
          numericValue={kpis.openAmount}
        />
      </div>

      {/* Alerts */}
      <AdminAlertList alerts={alerts} />

      {/* Two-column: Recent leads + Recent customers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24 }}>
        <AdminMiniTable
          title="Recente leads"
          linkPrefix="/admin/leads"
          emptyMessage="Nog geen leads"
          columns={[
            { key: "name", label: "Naam" },
            { key: "source", label: "Bron" },
            {
              key: "lifecycle_stage",
              label: "Fase",
              render: (val) => (
                <span className="label-strong" style={{ fontSize: 10 }}>
                  {String(val)}
                </span>
              ),
            },
            {
              key: "created_at",
              label: "Datum",
              render: (val) => (
                <span className="label">{formatDate(String(val))}</span>
              ),
            },
          ]}
          rows={recentLeads as unknown as Record<string, unknown>[]}
        />
        <AdminMiniTable
          title="Recente klanten"
          linkPrefix="/admin/customers"
          emptyMessage="Nog geen klanten"
          columns={[
            { key: "name", label: "Naam" },
            {
              key: "status",
              label: "Status",
              render: (val) => (
                <span className={`status-badge ${val === "active" ? "status-badge--sent" : "status-badge--overdue"}`}>
                  {val === "active" ? "Actief" : "Geblokkeerd"}
                </span>
              ),
            },
            {
              key: "total_revenue",
              label: "Omzet",
              align: "right" as const,
              render: (val) => (
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrency(Number(val))}
                </span>
              ),
            },
            {
              key: "created_at",
              label: "Aangemeld",
              render: (val) => (
                <span className="label">{formatDate(String(val))}</span>
              ),
            },
          ]}
          rows={recentCustomers as unknown as Record<string, unknown>[]}
        />
      </div>

      {/* Quick Actions */}
      <AdminQuickActions
        items={[
          { label: "Pipeline", href: "/admin/pipeline" },
          { label: "Alle klanten", href: "/admin/customers" },
          { label: "Gebruikers", href: "/admin/users" },
          { label: "Wachtlijst", href: "/admin/waitlist", count: quickActionsData.waitlistCount },
          { label: "Geblokkeerd", href: "/admin/users", count: quickActionsData.suspendedCount },
          { label: "Fiscale controle", href: "/admin/audit" },
        ]}
      />
    </div>
  );
}
