import Link from "next/link";
import type { AdminAlert } from "./actions";

const alertColorMap: Record<AdminAlert["type"], string> = {
  inactive: "var(--color-warning)",
  suspended: "var(--color-accent)",
  incomplete: "var(--color-warning)",
  overdue: "var(--color-accent)",
  leads_stale: "var(--color-warning)",
};

export function AdminAlertList({ alerts }: { alerts: AdminAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h3 className="label">Aandacht nodig</h3>
        </div>
        <p className="admin-empty-state">Geen aandachtspunten</p>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3 className="label">Aandacht nodig</h3>
      </div>
      <div className="admin-alert-list">
        {alerts.map((alert) => {
          const color = alertColorMap[alert.type];
          return (
            <Link key={alert.type} href={alert.href} className="admin-alert-item">
              <div className="admin-alert-item-left">
                <span className="admin-alert-dot" style={{ background: color }} />
                <span className="admin-alert-label">{alert.message}</span>
              </div>
              <span className="admin-alert-badge" style={{ color, borderColor: color }}>
                {alert.count}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
