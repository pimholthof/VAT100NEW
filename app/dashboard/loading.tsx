export default function DashboardLoading() {
  return (
    <div className="py-16">
      <div className="grid grid-cols-[repeat(4,1fr)] gap-px mb-16 stat-cards-grid">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="py-5 px-6">
            <div className="skeleton w-20 h-[9px] mb-3" />
            <div className="skeleton w-[120px] h-8" />
          </div>
        ))}
      </div>

      <div className="mb-12">
        <div className="skeleton w-[140px] h-3 mb-6" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton w-full h-10 mb-px" />
        ))}
      </div>
    </div>
  );
}
