import React from "react";

export function SkeletonTable({
  columns = "1fr 2fr 1fr 1fr 80px",
  rows = 5,
  headerWidths = [60, 80, 70, 60, 40],
  bodyWidths = [50, 70, 60, 50, 30],
}: {
  columns?: string;
  rows?: number;
  headerWidths?: number[];
  bodyWidths?: number[];
}) {
  return (
    <div style={{ opacity: 0.12 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: columns,
          gap: 12,
          padding: "10px 12px",
          borderBottom: "1px solid var(--foreground)",
        }}
      >
        {headerWidths.map((w, i) => (
          <div
            key={i}
            className="skeleton"
            style={{ width: `${w}%`, height: 9 }}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          style={{
            display: "grid",
            gridTemplateColumns: columns,
            gap: 12,
            padding: "12px 12px",
            borderBottom: "1px solid rgba(13, 13, 11, 0.08)",
          }}
        >
          {bodyWidths.map((w, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ width: `${w}%`, height: 13 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
