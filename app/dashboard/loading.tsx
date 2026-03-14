export default function DashboardLoading() {
  return (
    <div style={{ padding: "64px 0" }}>
      {/* Stat cards skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          marginBottom: 64,
        }}
        className="stat-cards-grid"
      >
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ padding: "20px 24px" }}>
            <div
              className="skeleton"
              style={{ width: 80, height: 9, marginBottom: 12 }}
            />
            <div className="skeleton" style={{ width: 120, height: 32 }} />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div style={{ marginBottom: 48 }}>
        <div
          className="skeleton"
          style={{ width: 140, height: 12, marginBottom: 24 }}
        />
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{ width: "100%", height: 40, marginBottom: 1 }}
          />
        ))}
      </div>
    </div>
  );
}
