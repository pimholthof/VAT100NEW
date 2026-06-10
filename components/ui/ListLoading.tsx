import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";

interface ListLoadingProps {
  rows?: number;
  /** Spiegelt de tabs-bar van de echte pagina (aantal tabs, 0 = geen). */
  tabs?: number;
  /** Spiegelt de page-header: titel + label + actieknop rechts. */
  header?: boolean;
  /** Spiegelt de zoek-/filterbalk. */
  search?: boolean;
}

export default function ListLoading({
  rows = 6,
  tabs = 0,
  header = false,
  search = false,
}: ListLoadingProps) {
  return (
    <div style={{ padding: "64px 0" }}>
      {tabs > 0 && (
        <div
          style={{
            display: "flex",
            gap: 28,
            paddingBottom: 12,
            borderBottom: "0.5px solid rgba(0, 0, 0, 0.08)",
            marginBottom: 40,
          }}
        >
          {[...Array(tabs)].map((_, i) => (
            <Skeleton key={i} width={i === 0 ? 64 : 80} height={14} />
          ))}
        </div>
      )}
      {header ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 24,
            marginBottom: 40,
          }}
        >
          <div>
            <Skeleton width={220} height={40} style={{ marginBottom: 10 }} />
            <Skeleton width={90} height={10} />
          </div>
          <Skeleton width={140} height={42} style={{ borderRadius: 24 }} />
        </div>
      ) : (
        <Skeleton width={140} height={32} style={{ marginBottom: 32 }} />
      )}
      {search && (
        <Skeleton
          width="100%"
          height={48}
          style={{ borderRadius: 24, marginBottom: 24 }}
        />
      )}
      <TableSkeleton rows={rows} />
    </div>
  );
}
