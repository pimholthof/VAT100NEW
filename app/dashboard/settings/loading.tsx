import { Skeleton } from "@/components/ui/Skeleton";

export default function SettingsLoading() {
  return (
    <div style={{ padding: "64px 0" }}>
      <Skeleton width={180} height={32} style={{ marginBottom: 32 }} />
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{ marginBottom: 20 }}>
          <Skeleton width={80} height={9} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={36} />
        </div>
      ))}
    </div>
  );
}
