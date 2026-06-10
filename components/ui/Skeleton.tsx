import type { CSSProperties } from "react";

export function Skeleton({
  width,
  height,
  style,
}: {
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
}) {
  return (
    <div
      className="skeleton"
      style={{ width, height, ...style }}
    />
  );
}

export function TableSkeleton({
  rows = 5,
  rowHeight = 48,
}: {
  rows?: number;
  rowHeight?: number;
}) {
  return (
    <div role="status" aria-label="Laden...">
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ width: "100%", height: rowHeight, marginBottom: 1 }}
        />
      ))}
    </div>
  );
}
