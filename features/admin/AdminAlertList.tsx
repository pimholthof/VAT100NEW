import Link from "next/link";
import type { AdminAlert } from "./actions";

const alertColors: Record<AdminAlert["type"], string> = {
  inactive: "var(--color-warning)",
  suspended: "var(--color-accent)",
  incomplete: "var(--color-warning)",
  overdue: "var(--color-accent)",
  leads_stale: "var(--color-warning)",
};

export function AdminAlertList({ alerts }: { alerts: AdminAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="brutalist-panel">
        <div className="brutalist-panel-padded">
          <h3 className="label" style={{ marginBottom: 16 }}>Aandacht nodig</h3>
          <p style={{ fontSize: "var(--text-body-md)", opacity: 0.4 }}>
            Geen aandachtspunten
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="brutalist-panel">
      <div className="brutalist-panel-header" style={{ padding: "16px 24px" }}>
        <h3 className="label" style={{ margin: 0 }}>Aandacht nodig</h3>
      </div>
      <div style={{ padding: "0 24px" }}>
        {alerts.map((alert) => (
          <Link
            key={alert.type}
            href={alert.href}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              padding: "14px 0",
              borderBottom: "0.5px solid rgba(0,0,0,0.06)",
              textDecoration: "none",
              color: "var(--foreground)",
              transition: "opacity 0.15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: alertColors[alert.type],
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: "var(--text-body-md)" }}>
                {alert.message}
              </span>
            </div>
            <span
              className="label-strong"
              style={{
                padding: "2px 10px",
                border: `1px solid ${alertColors[alert.type]}`,
                borderRadius: "9999px",
                color: alertColors[alert.type],
                fontSize: 9,
                flexShrink: 0,
              }}
            >
              {alert.count}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
