import Link from "next/link";
import { TableWrapper, Th, Td } from "@/components/ui";

interface Column {
  key: string;
  label: string;
  align?: "left" | "right";
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

export function AdminMiniTable({
  title,
  columns,
  rows,
  linkPrefix,
  emptyMessage = "Geen gegevens",
}: {
  title: string;
  columns: Column[];
  rows: Record<string, unknown>[];
  linkPrefix: string;
  emptyMessage?: string;
}) {
  return (
    <div className="brutalist-panel">
      <div className="brutalist-panel-header" style={{ padding: "16px 24px" }}>
        <h3 className="label" style={{ margin: 0 }}>{title}</h3>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: "24px" }}>
          <p style={{ fontSize: "var(--text-body-md)", opacity: 0.4 }}>
            {emptyMessage}
          </p>
        </div>
      ) : (
        <TableWrapper>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <Th key={col.key} style={{ textAlign: col.align ?? "left" }}>
                    {col.label}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id as string}>
                  {columns.map((col, i) => (
                    <Td key={col.key} style={{ textAlign: col.align ?? "left" }}>
                      {i === 0 ? (
                        <Link
                          href={`${linkPrefix}/${row.id}`}
                          style={{
                            textDecoration: "none",
                            color: "var(--foreground)",
                            fontWeight: 500,
                          }}
                        >
                          {col.render
                            ? col.render(row[col.key], row)
                            : String(row[col.key] ?? "\u2014")}
                        </Link>
                      ) : col.render ? (
                        col.render(row[col.key], row)
                      ) : (
                        String(row[col.key] ?? "\u2014")
                      )}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrapper>
      )}
    </div>
  );
}
