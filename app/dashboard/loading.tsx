import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div style={{ padding: "64px 0" }}>
      {/* Hero: vrij te besteden */}
      <div style={{ marginBottom: 64 }}>
        <Skeleton width={130} height={10} style={{ marginBottom: 16 }} />
        <Skeleton width={320} height={72} style={{ marginBottom: 16 }} />
        <Skeleton width={230} height={12} />
      </div>

      {/* Nu doen-paneel */}
      <Skeleton
        width="100%"
        height={120}
        style={{ borderRadius: "var(--radius)", marginBottom: 48 }}
      />

      {/* De drie potten */}
      <Skeleton
        width="100%"
        height={88}
        style={{ borderRadius: "var(--radius)", marginBottom: 64 }}
      />

      {/* Open facturen */}
      <Skeleton width={160} height={12} style={{ marginBottom: 24 }} />
      <TableSkeleton rows={4} />
    </div>
  );
}
