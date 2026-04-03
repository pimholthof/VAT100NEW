"use client";

import { useQuery } from "@tanstack/react-query";
import { StatCard, SkeletonCard } from "@/components/ui/StatCard";
import { formatCurrency } from "@/lib/format";
import type { PageKpis } from "./actions";
import type { ActionResult } from "@/lib/types";

export function AdminPageKpis({
  queryKey,
  queryFn,
}: {
  queryKey: string;
  queryFn: () => Promise<ActionResult<PageKpis>>;
}) {
  const { data: result, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn,
  });

  const items = result?.data?.items ?? [];

  if (isLoading) {
    return (
      <div className="admin-stat-grid">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="admin-stat-grid">
      {items.map((item) => (
        <StatCard
          key={item.label}
          label={item.label}
          value={item.isCurrency ? formatCurrency(item.value) : String(item.value)}
          numericValue={item.value}
          isCurrency={item.isCurrency ?? false}
          compact
        />
      ))}
    </div>
  );
}
