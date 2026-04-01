import Link from "next/link";

interface QuickAction {
  label: string;
  href: string;
  count?: number;
}

export function AdminQuickActions({ items }: { items: QuickAction[] }) {
  return (
    <div>
      <h3 className="label" style={{ marginBottom: 16 }}>Snelle acties</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              border: "0.5px solid rgba(0,0,0,0.12)",
              borderRadius: "var(--radius)",
              textDecoration: "none",
              color: "var(--foreground)",
              fontSize: "var(--text-body-sm)",
              fontWeight: 500,
              transition: "all 0.15s ease",
              background: "transparent",
            }}
          >
            {item.label}
            {item.count !== undefined && item.count > 0 && (
              <span
                className="label-strong"
                style={{
                  fontSize: 9,
                  opacity: 0.5,
                  padding: "1px 6px",
                  background: "rgba(0,0,0,0.04)",
                  borderRadius: "9999px",
                }}
              >
                {item.count}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
