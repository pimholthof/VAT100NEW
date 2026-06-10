import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function TaxLoading() {
  return (
    <div style={{ padding: "64px 0" }}>
      {/* Header: label + display-titel links, actieknoppen rechts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "end",
          borderBottom: "1px solid var(--color-black)",
          paddingBottom: 20,
          marginBottom: "var(--space-xl)",
        }}
      >
        <div>
          <Skeleton width={150} height={10} style={{ marginBottom: 12 }} />
          <Skeleton width={240} height={44} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Skeleton width={140} height={42} style={{ borderRadius: 24 }} />
          <Skeleton width={150} height={42} style={{ borderRadius: 24 }} />
        </div>
      </div>

      {/* Aangiftes & afsluiting (FilingOverview-kaart) */}
      <Skeleton
        width="100%"
        height={140}
        style={{ borderRadius: "var(--radius)", marginBottom: "var(--space-xl)" }}
      />

      {/* Inkomstenbelasting: 4-koloms statband */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 24,
          padding: "24px 0",
          borderTop: "1px solid var(--color-black)",
          borderBottom: "1px solid var(--color-black)",
          marginBottom: "var(--space-xl)",
        }}
      >
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            <Skeleton width={100} height={9} style={{ marginBottom: 14 }} />
            <Skeleton width={110} height={22} style={{ marginBottom: 10 }} />
            <Skeleton width={90} height={9} />
          </div>
        ))}
      </div>

      {/* BTW-zone: kwartalentabel */}
      <Skeleton width={120} height={10} style={{ marginBottom: 24 }} />
      <TableSkeleton rows={4} />
    </div>
  );
}
