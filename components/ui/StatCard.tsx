import React from "react";

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="stat-card">
      <p className="stat-card-label">{label}</p>
      <p className="stat-card-value">{value}</p>
      {sub && <p className="stat-card-sub">{sub}</p>}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="stat-card" style={{ opacity: 0.12, border: "none" }}>
      <div className="skeleton" style={{ width: "60%", height: 9 }} />
      <div className="skeleton" style={{ width: "80%", height: 28 }} />
    </div>
  );
}
