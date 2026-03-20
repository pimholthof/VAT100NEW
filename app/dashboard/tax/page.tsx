"use client";

import { useQuery } from "@tanstack/react-query";
import { getBtwOverview } from "@/lib/actions/tax";
import { getDashboardData } from "@/lib/actions/dashboard";
import type { QuarterStats } from "@/lib/actions/tax";
import { StatCard, SkeletonCard, SkeletonTable, Th, Td } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { estimateIncomeTax, ZELFSTANDIGENAFTREK, MKB_WINSTVRIJSTELLING_RATE } from "@/lib/tax";

export default function TaxPage() {
  const { data: result, isLoading } = useQuery({
    queryKey: ["btw-overview"],
    queryFn: () => getBtwOverview(),
  });

  const { data: dashResult } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
  });

  const quarters = result?.data ?? [];
  const current = quarters.length > 0 ? quarters[0] : null;
  const safeToSpend = dashResult?.data?.safeToSpend;
  const vatDeadline = dashResult?.data?.vatDeadline;

  // Year-end IB projection via lib/tax.ts (IB 2025 schijven)
  const now = new Date();
  const monthsElapsed = now.getMonth() + 1;
  const yearRevenueExVat = quarters
    .filter((q) => q.quarter.includes(String(now.getFullYear())))
    .reduce((sum, q) => sum + q.revenueExVat, 0);
  const annualizedRevenue = monthsElapsed > 0 ? (yearRevenueExVat / monthsElapsed) * 12 : 0;
  const mkbVrijstelling = Math.round(
    Math.max(0, annualizedRevenue - ZELFSTANDIGENAFTREK) * MKB_WINSTVRIJSTELLING_RATE * 100
  ) / 100;
  const estimatedIB = estimateIncomeTax(annualizedRevenue);

  // Total year BTW
  const yearBtw = quarters
    .filter((q) => q.quarter.includes(String(now.getFullYear())))
    .reduce((sum, q) => sum + q.netVat, 0);

  return (
    <div>
      <div className="mb-[80px]">
        <h1 className="display-title">
          Belasting
        </h1>
        <p className="font-sans text-[length:var(--text-body-lg)] font-light mt-4 mb-0 opacity-50">
          Alles over je BTW en inkomstenbelasting
        </p>
      </div>

      <div
        className="stat-cards-grid grid grid-cols-3 gap-px bg-foreground/8 border border-foreground/8 mb-[var(--space-section)]"
      >
        <YearCard
          label={`Geschatte IB ${now.getFullYear()}`}
          value={formatCurrency(Math.round(estimatedIB))}
          sublabel={`Omzet (geannualiseerd): ${formatCurrency(Math.round(annualizedRevenue))}`}
        />
        <YearCard
          label={`BTW totaal ${now.getFullYear()}`}
          value={formatCurrency(Math.round(yearBtw))}
          sublabel={`${quarters.filter((q) => q.quarter.includes(String(now.getFullYear()))).length} kwartalen`}
        />
        <YearCard
          label="Totale belastingdruk"
          value={formatCurrency(Math.round(estimatedIB + Math.max(0, yearBtw)))}
          sublabel={safeToSpend ? `Safe-to-Spend: ${formatCurrency(safeToSpend.safeToSpend)}` : ""}
        />
      </div>

      <div className="mb-[var(--space-section)]">
        <h2 className="section-header mb-4">
          Jouw aftrekposten
        </h2>
        <div className="stat-cards-grid grid grid-cols-3 gap-6">
          <DeductionItem
            label="Zelfstandigenaftrek"
            value={formatCurrency(ZELFSTANDIGENAFTREK)}
            note="1.225+ uur per jaar"
          />
          <DeductionItem
            label="MKB-winstvrijstelling"
            value={formatCurrency(Math.round(mkbVrijstelling))}
            note={`${(MKB_WINSTVRIJSTELLING_RATE * 100).toFixed(2)}% van de winst na ZA`}
          />
          <DeductionItem
            label="Aftrekbare BTW (YTD)"
            value={formatCurrency(
              quarters
                .filter((q) => q.quarter.includes(String(now.getFullYear())))
                .reduce((sum, q) => sum + q.inputVat, 0)
            )}
            note="Via bonnetjes"
          />
        </div>
      </div>

      {vatDeadline && (
        <div className="p-5 border border-foreground/8 mb-[var(--space-section)] flex justify-between items-center">
          <div>
            <p className="label opacity-50 mb-1">
              Volgende BTW-aangifte
            </p>
            <p className="font-sans text-[length:var(--text-body-lg)] font-medium m-0">
              {vatDeadline.quarter} — {vatDeadline.deadline}
            </p>
          </div>
          <div className="text-right">
            <p className="font-[family-name:var(--font-display)] text-[length:var(--text-h1)] font-bold tracking-[var(--tracking-display)] mb-1">
              {vatDeadline.daysRemaining}d
            </p>
            <p className="label opacity-50 m-0">
              {formatCurrency(vatDeadline.estimatedAmount)}
            </p>
          </div>
        </div>
      )}

      {!isLoading && current && (
        <div className="mb-[var(--space-section)]">
          <p className="label mb-4 opacity-30">
            {current.netVat >= 0 ? "Te betalen dit kwartaal" : "Te vorderen dit kwartaal"}
          </p>
          <p className="font-[family-name:var(--font-display)] text-[length:var(--text-display)] font-bold leading-[0.85] tracking-[var(--tracking-display)] m-0">
            {formatCurrency(Math.abs(current.netVat))}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="editorial-divider mb-[var(--space-block)]">
          <div
            className="stat-cards-grid grid grid-cols-3 gap-[var(--space-element)]"
          >
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ) : current ? (
        <div className="editorial-divider mb-[var(--space-section)]">
          <div
            className="stat-cards-grid grid grid-cols-3 gap-[var(--space-element)]"
          >
            <StatCard
              label="Output BTW"
              value={formatCurrency(current.outputVat)}
            />
            <StatCard
              label="Aftrekbare BTW"
              value={formatCurrency(current.inputVat)}
            />
            <StatCard
              label="Aantal facturen"
              value={String(current.invoiceCount)}
            />
          </div>
        </div>
      ) : null}

      <h2 className="section-header mb-4">
        Kwartaaloverzicht
      </h2>

      {isLoading ? (
        <SkeletonTable
          columns="1fr 1fr 1fr 1fr 1fr 1fr"
          rows={4}
          headerWidths={[60, 80, 70, 70, 60, 50]}
          bodyWidths={[50, 70, 60, 60, 50, 40]}
        />
      ) : quarters.length > 0 ? (
        <table className="w-full border-collapse mb-[var(--space-block)]">
          <thead>
            <tr className="border-b border-foreground/15 text-left">
              <Th>Kwartaal</Th>
              <Th className="text-right">Omzet excl. BTW</Th>
              <Th className="text-right">Output BTW</Th>
              <Th className="text-right">Aftrekbare BTW</Th>
              <Th className="text-right">Netto BTW</Th>
              <Th className="text-right">Export</Th>
            </tr>
          </thead>
          <tbody>
            {quarters.map((q: QuarterStats) => (
              <tr key={q.quarter} className="border-b border-foreground/6">
                <Td className="font-normal">
                  <span className="mono-amount">{q.quarter}</span>
                </Td>
                <Td className="text-right">
                  <span className="mono-amount">{formatCurrency(q.revenueExVat)}</span>
                </Td>
                <Td className="text-right">
                  <span className="mono-amount">{formatCurrency(q.outputVat)}</span>
                </Td>
                <Td className="text-right">
                  <span className="mono-amount">{formatCurrency(q.inputVat)}</span>
                </Td>
                <Td className="text-right">
                  <span className="mono-amount">{formatCurrency(q.netVat)}</span>
                </Td>
                <Td className="text-right">
                  <a
                    href={`/api/tax/quarter-pdf?quarter=${encodeURIComponent(q.quarter)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="table-action"
                  >
                    PDF
                  </a>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="empty-state">
          Nog geen gegevens
        </p>
      )}

      <div className="p-5 bg-foreground/2 font-mono text-[11px] font-normal leading-[1.6]">
        Dit overzicht is indicatief. Dien je BTW-aangifte in via het portaal van
        de Belastingdienst. Bewaar je facturen en bonnen minimaal 7 jaar.
        Inkomstenbelastingschatting is gebaseerd op IB-schijven 2025 (35,82% / 37,48% / 49,50%).
        Zelfstandigenaftrek (€7.390) en MKB-winstvrijstelling (13,31%) zijn meegenomen.
      </div>
    </div>
  );
}

function YearCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="bg-[var(--background)] p-5">
      <p className="label mb-2 opacity-55">
        {label}
      </p>
      <p className="font-[family-name:var(--font-display)] text-[length:var(--text-h2)] font-bold tracking-[var(--tracking-display)] mb-1">
        {value}
      </p>
      <p className="font-sans text-[length:var(--text-caption)] font-light opacity-45 m-0">
        {sublabel}
      </p>
    </div>
  );
}

function DeductionItem({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div>
      <p className="label mb-1 opacity-55">
        {label}
      </p>
      <p className="font-mono text-[length:var(--text-body-lg)] font-normal mb-0.5">
        {value}
      </p>
      <p className="font-sans text-[length:var(--text-caption)] font-light opacity-40 m-0">
        {note}
      </p>
    </div>
  );
}
