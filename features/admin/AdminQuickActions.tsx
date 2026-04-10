import Link from "next/link";

interface QuickAction {
  label: string;
  href: string;
  count?: number;
}

export function AdminQuickActions({ items }: { items: QuickAction[] }) {
  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3 className="label">Snelle acties</h3>
      </div>
      <div className="admin-quick-actions-grid">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="admin-quick-action-item">
            <span>{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <span className="admin-quick-action-count">{item.count}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
