import { Skeleton } from "@/components/ui/Skeleton";

export default function SettingsLoading() {
  return (
    <div className="py-16">
      <Skeleton width={180} height={32} className="mb-8" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="mb-5">
          <Skeleton width={80} height={9} className="mb-2" />
          <Skeleton width="100%" height={36} />
        </div>
      ))}
    </div>
  );
}
