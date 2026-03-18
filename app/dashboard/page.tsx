import { Suspense } from "react";
import { getDashboardData } from "@/lib/actions/dashboard";
import DashboardClient from "./DashboardClient";

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-8 p-8">
      <div className="h-8 w-48 rounded bg-black/5" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-black/5" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-black/5" />
    </div>
  );
}

async function DashboardContent() {
  const result = await getDashboardData();
  return <DashboardClient initialResult={result} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
