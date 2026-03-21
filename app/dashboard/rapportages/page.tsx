"use client";

import { useQuery } from "@tanstack/react-query";
import { getReportData } from "@/lib/actions/reports";
import type { MonthlyProfit } from "@/lib/actions/reports";
import { formatCurrency } from "@/lib/format";
import { ErrorMessage } from "@/components/ui";

const MONTH_LABELS = [
  "Jan", "Feb", "Mrt", "Apr", "Mei", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dec",
];

export default function RapportagesPage() {
  const year = new Date().getFullYear();
  const { data: result, isLoading } = useQuery({
    queryKey: ["reports", year],
    queryFn: () => getReportData(year),
  });

  if (isLoading) {
    return (
      <div>
        <h1 className="display-title mb-12 md:mb-[80px]">Rapportages</h1>
        <div className="skeleton h-[200px] mb-8" />
        <div className="skeleton h-[200px]" />
      </div>
    );
  }

  if (result?.error) {
    return (
      <div>
        <h1 className="display-title mb-12 md:mb-[80px]">Rapportages</h1>
        <ErrorMessage>{result.error}</ErrorMessage>
      </div>
    );
  }

  const data = result?.data;
  if (!data) return null;

  return (
    <div>
      <div className="mb-12 md:mb-[80px]">
        <h1 className="display-title">Rapportages</h1>
        <p className="font-sans text-[length:var(--text-body-lg)] font-light mt-4 mb-0 opacity-50">
          Inzichten in je omzet, kosten en winst — {year}
        </p>
      </div>

      {/* Jaartotalen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-foreground/8 border border-foreground/8 mb-12 md:mb-[var(--space-section)]">
        <div className="bg-[var(--background)] p-5">
          <p className="label mb-2 opacity-55">Totale omzet</p>
          <p className="font-mono text-xl font-bold">{formatCurrency(data.yearTotals.revenue)}</p>
          <p className="font-sans text-[length:var(--text-caption)] font-light opacity-45 m-0">
            {data.yearTotals.invoiceCount} facturen
          </p>
        </div>
        <div className="bg-[var(--background)] p-5">
          <p className="label mb-2 opacity-55">Totale kosten</p>
          <p className="font-mono text-xl font-bold">{formatCurrency(data.yearTotals.costs)}</p>
          <p className="font-sans text-[length:var(--text-caption)] font-light opacity-45 m-0">
            {data.yearTotals.receiptCount} bonnen
          </p>
        </div>
        <div className="bg-[var(--background)] p-5">
          <p className="label mb-2 opacity-55">Netto winst</p>
          <p className={`font-mono text-xl font-bold ${data.yearTotals.profit >= 0 ? "text-[var(--color-safe)]" : "text-[var(--color-reserved)]"}`}>
            {formatCurrency(data.yearTotals.profit)}
          </p>
          <p className="font-sans text-[length:var(--text-caption)] font-light opacity-45 m-0">
            excl. BTW
          </p>
        </div>
      </div>

      {/* Maandelijkse winst chart */}
      <div className="mb-12 md:mb-[var(--space-section)]">
        <h2 className="section-header mb-6">Maandelijkse winst</h2>
        <BarChart data={data.monthlyProfit} />
      </div>

      {/* Omzet per klant */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-12 md:mb-[var(--space-section)]">
        <div>
          <h2 className="section-header mb-6">Omzet per klant</h2>
          {data.revenueByClient.length > 0 ? (
            <HorizontalBars
              items={data.revenueByClient.map((c) => ({
                label: c.clientName,
                value: c.totalExVat,
                sublabel: `${c.invoiceCount} facturen`,
              }))}
            />
          ) : (
            <p className="label opacity-40">Nog geen factuurgegevens</p>
          )}
        </div>

        <div>
          <h2 className="section-header mb-6">Kosten per categorie</h2>
          {data.costsByCategory.length > 0 ? (
            <HorizontalBars
              items={data.costsByCategory.map((c) => ({
                label: c.category,
                value: c.total,
                sublabel: `${c.count} bonnen`,
              }))}
            />
          ) : (
            <p className="label opacity-40">Nog geen kostengegevens</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * SVG bar chart — maandelijkse winst
 */
function BarChart({ data }: { data: MonthlyProfit[] }) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.revenue, d.costs, 1)));
  const height = 160;
  const barWidth = 24;
  const gap = 8;
  const totalWidth = data.length * (barWidth * 2 + gap + 12);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalWidth} ${height + 40}`}
        className="w-full max-w-[700px] h-auto"
        style={{ minWidth: `${Math.min(totalWidth, 500)}px` }}
      >
        {data.map((d, i) => {
          const x = i * (barWidth * 2 + gap + 12) + 8;
          const revenueH = (d.revenue / maxVal) * height;
          const costsH = (d.costs / maxVal) * height;

          return (
            <g key={d.month}>
              {/* Revenue bar */}
              <rect
                x={x}
                y={height - revenueH}
                width={barWidth}
                height={revenueH}
                fill="var(--color-ink)"
                opacity={0.8}
              />
              {/* Costs bar */}
              <rect
                x={x + barWidth + 2}
                y={height - costsH}
                width={barWidth}
                height={costsH}
                fill="var(--color-ink)"
                opacity={0.2}
              />
              {/* Month label */}
              <text
                x={x + barWidth}
                y={height + 16}
                textAnchor="middle"
                className="fill-current opacity-40"
                fontSize="9"
                fontFamily="var(--font-body)"
              >
                {MONTH_LABELS[i]}
              </text>
              {/* Profit amount */}
              <text
                x={x + barWidth}
                y={height + 30}
                textAnchor="middle"
                className={`fill-current ${d.profit >= 0 ? "opacity-30" : "opacity-60"}`}
                fontSize="8"
                fontFamily="var(--font-mono)"
              >
                {d.profit >= 0 ? "+" : ""}{Math.round(d.profit / 100) * 100 >= 1000
                  ? `${(d.profit / 1000).toFixed(1)}k`
                  : Math.round(d.profit).toString()}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <rect x={totalWidth - 100} y={4} width={10} height={10} fill="var(--color-ink)" opacity={0.8} />
        <text x={totalWidth - 86} y={12} fontSize="9" className="fill-current opacity-50" fontFamily="var(--font-body)">Omzet</text>
        <rect x={totalWidth - 100} y={20} width={10} height={10} fill="var(--color-ink)" opacity={0.2} />
        <text x={totalWidth - 86} y={28} fontSize="9" className="fill-current opacity-50" fontFamily="var(--font-body)">Kosten</text>
      </svg>
    </div>
  );
}

/**
 * Horizontal bar chart — voor omzet per klant / kosten per categorie
 */
function HorizontalBars({
  items,
}: {
  items: { label: string; value: number; sublabel: string }[];
}) {
  const maxVal = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-3">
      {items.slice(0, 8).map((item) => {
        const pct = (item.value / maxVal) * 100;
        return (
          <div key={item.label}>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-sm truncate max-w-[60%]">{item.label}</span>
              <span className="font-mono text-[13px] font-medium">
                {formatCurrency(item.value)}
              </span>
            </div>
            <div className="h-1.5 bg-foreground/5 w-full">
              <div
                className="h-full bg-foreground/30"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] opacity-40 mt-0.5">{item.sublabel}</p>
          </div>
        );
      })}
    </div>
  );
}
