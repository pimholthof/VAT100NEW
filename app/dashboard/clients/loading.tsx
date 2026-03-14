import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function ClientsLoading() {
  return (
    <div style={{ padding: "64px 0" }}>
      <Skeleton width={140} height={32} style={{ marginBottom: 32 }} />
      <TableSkeleton rows={6} />
    </div>
  );
}
