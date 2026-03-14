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

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ width: "100%", height: 40, marginBottom: 1 }}
        />
      ))}
    </div>
  );
}
