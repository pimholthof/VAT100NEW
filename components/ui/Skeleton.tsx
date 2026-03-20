import type { CSSProperties } from "react";

export function Skeleton({
  width,
  height,
  style,
  className,
}: {
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className ? `skeleton ${className}` : "skeleton"}
      style={{ width, height, ...style }}
    />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Laden...">
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
