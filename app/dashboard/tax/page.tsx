"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getBtwOverview,
  getVatReturns,
  createOrUpdateVatReturn,
  submitVatReturn,
  markVatReturnPaid,
  deleteVatReturn,
} from "@/lib/actions/tax";
import { getDashboardData } from "@/lib/actions/dashboard";
import type { QuarterStats } from "@/lib/actions/tax";
import type { VatReturn } from "@/lib/types";
import { StatCard, SkeletonCard, SkeletonTable, Th, Td } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { estimateIncomeTax, ZELFSTANDIGENAFTREK, MKB_WINSTVRIJSTELLING_RATE } from "@/lib/tax";

const STATUS_LABELS: Record<string, string> = {
  concept: "Concept",
  ingediend: "Ingediend",
  betaald: "Betaald",
};

const STATUS_COLORS: Record<string, string> = {
  concept: "bg-foreground/5 text-foreground/60",
  ingediend: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  betaald: "bg-[var(--color-safe)]/10 text-[var(--color-safe)]",
};

export default function TaxPage() {
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: result, isLoading } = useQuery({
    queryKey: ["btw-overview"],
    queryFn: () => getBtwOverview(),
  });

  const { data: dashResult } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
  });

  const { data: vatReturnsResult } = useQuery({
    queryKey: ["vat-returns"],
    queryFn: () => getVatReturns(),
  });

  const quarters = result?.data ?? [];
  const current = quarters.length > 0 ? quarters[0] : null;
  const safeToSpend = dashResult?.data?.safeToSpend;
  const vatDeadline = dashResult?.data?.vatDeadline;
  const vatReturns = vatReturnsResult?.data ?? [];

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

  // Find which quarters have a vat_return already
  const vatReturnByQuarter = new Map<string, VatReturn>();
  for (const vr of vatReturns) {
    const start = new Date(vr.period_start);
    const q = Math.floor(start.getMonth() / 3) + 1;
    const key = `Q${q} ${start.getFullYear()}`;
    vatReturnByQuarter.set(key, vr);
  }

  async function handlePrepareReturn(quarterStr: string) {
    setActionLoading(quarterStr);
    setActionError(null);
    const res = await createOrUpdateVatReturn(quarterStr);
    if (res.error) setActionError(res.error);
    queryClient.invalidateQueries({ queryKey: ["vat-returns"] });
    setActionLoading(null);
  }

  async function handleSubmitReturn(vatReturnId: string) {
    setActionLoading(vatReturnId);
    setActionError(null);
    const res = await submitVatReturn(vatReturnId);
    if (res.error) setActionError(res.error);
    queryClient.invalidateQueries({ queryKey: ["vat-returns"] });
    setActionLoading(null);
  }

  async function handleMarkPaid(vatReturnId: string) {
    setActionLoading(vatReturnId);
    setActionError(null);
    const res = await markVatReturnPaid(vatReturnId);
    if (res.error) setActionError(res.error);
    queryClient.invalidateQueries({ queryKey: ["vat-returns"] });
    setActionLoading(null);
  }

  async function handleDeleteReturn(vatReturnId: string) {
    setActionLoading(vatReturnId);
    setActionError(null);
    const res = await deleteVatReturn(vatReturnId);
    if (res.error) setActionError(res.error);
    queryClient.invalidateQueries({ queryKey: ["vat-returns"] });
    setActionLoading(null);
  }

  return (
    <div>
      <div className="mb-12 md:mb-[80px]">
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
        <div className="p-5 border border-foreground/8 mb-[var(--space-section)] flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <p className="label opacity-50 mb-1">
              Volgende BTW-aangifte
            </p>
            <p className="font-sans text-[length:var(--text-body-lg)] font-medium m-0">
              {vatDeadline.quarter} — {vatDeadline.deadline}
            </p>
          </div>
          <div className="sm:text-right">
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

      {/* BTW-aangiftes sectie */}
      <h2 className="section-header mb-4">
        BTW-aangiftes
      </h2>

      {actionError && (
        <div className="p-3 mb-4 border border-[var(--color-reserved)] text-[var(--color-reserved)] text-sm">
          {actionError}
        </div>
      )}

      {vatReturns.length > 0 ? (
        <div className="overflow-x-auto mb-[var(--space-section)]">
        <table className="w-full border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-foreground/15 text-left">
              <Th>Periode</Th>
              <Th className="text-right">Output BTW</Th>
              <Th className="text-right">Input BTW</Th>
              <Th className="text-right">Te betalen</Th>
              <Th>Status</Th>
              <Th className="text-right">Acties</Th>
            </tr>
          </thead>
          <tbody>
            {vatReturns.map((vr: VatReturn) => {
              const start = new Date(vr.period_start);
              const q = Math.floor(start.getMonth() / 3) + 1;
              const periodLabel = `Q${q} ${start.getFullYear()}`;
              const isCurrentAction = actionLoading === vr.id;

              return (
                <tr key={vr.id} className="border-b border-foreground/6">
                  <Td className="font-normal">
                    <span className="mono-amount">{periodLabel}</span>
                  </Td>
                  <Td className="text-right">
                    <span className="mono-amount">{formatCurrency(vr.output_vat)}</span>
                  </Td>
                  <Td className="text-right">
                    <span className="mono-amount">{formatCurrency(vr.input_vat)}</span>
                  </Td>
                  <Td className="text-right">
                    <span className="mono-amount font-semibold">{formatCurrency(vr.vat_due)}</span>
                  </Td>
                  <Td>
                    <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] font-medium ${STATUS_COLORS[vr.status] ?? ""}`}>
                      {STATUS_LABELS[vr.status] ?? vr.status}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <div className="flex gap-2 justify-end">
                      {vr.status === "concept" && (
                        <>
                          <button
                            onClick={() => handleSubmitReturn(vr.id)}
                            disabled={isCurrentAction}
                            className="table-action"
                          >
                            {isCurrentAction ? "..." : "Indienen"}
                          </button>
                          <button
                            onClick={() => handleDeleteReturn(vr.id)}
                            disabled={isCurrentAction}
                            className="table-action opacity-40 hover:opacity-100"
                          >
                            Verwijder
                          </button>
                        </>
                      )}
                      {vr.status === "ingediend" && (
                        <button
                          onClick={() => handleMarkPaid(vr.id)}
                          disabled={isCurrentAction}
                          className="table-action"
                        >
                          {isCurrentAction ? "..." : "Betaald"}
                        </button>
                      )}
                      {vr.submitted_at && (
                        <span className="text-[10px] opacity-40 font-mono">
                          {formatDate(vr.submitted_at)}
                        </span>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      ) : (
        <p className="label opacity-40 mb-[var(--space-section)]">
          Nog geen BTW-aangiftes aangemaakt. Gebruik de knop bij een kwartaal hieronder.
        </p>
      )}

      <h2 className="section-header mb-4">
        Kwartaaloverzicht
      </h2>

      {isLoading ? (
        <SkeletonTable
          columns="1fr 1fr 1fr 1fr 1fr 1fr 1fr"
          rows={4}
          headerWidths={[60, 80, 70, 70, 60, 50, 80]}
          bodyWidths={[50, 70, 60, 60, 50, 40, 70]}
        />
      ) : quarters.length > 0 ? (
        <div className="overflow-x-auto">
        <table className="w-full border-collapse mb-[var(--space-block)] min-w-[700px]">
          <thead>
            <tr className="border-b border-foreground/15 text-left">
              <Th>Kwartaal</Th>
              <Th className="text-right">Omzet excl. BTW</Th>
              <Th className="text-right">Output BTW</Th>
              <Th className="text-right">Aftrekbare BTW</Th>
              <Th className="text-right">Netto BTW</Th>
              <Th className="text-right">Export</Th>
              <Th className="text-right">Aangifte</Th>
            </tr>
          </thead>
          <tbody>
            {quarters.map((q: QuarterStats) => {
              const existingReturn = vatReturnByQuarter.get(q.quarter);
              const isCurrentAction = actionLoading === q.quarter;

              return (
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
                    <div className="flex gap-2 justify-end">
                      <a
                        href={`/api/tax/quarter-pdf?quarter=${encodeURIComponent(q.quarter)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="table-action"
                      >
                        PDF
                      </a>
                      <a
                        href={`/api/tax/quarter-xml?quarter=${encodeURIComponent(q.quarter)}`}
                        download
                        className="table-action opacity-60 hover:opacity-100"
                      >
                        XML
                      </a>
                    </div>
                  </Td>
                  <Td className="text-right">
                    {existingReturn ? (
                      <span className={`inline-block px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] ${STATUS_COLORS[existingReturn.status] ?? ""}`}>
                        {STATUS_LABELS[existingReturn.status] ?? existingReturn.status}
                      </span>
                    ) : (
                      <button
                        onClick={() => handlePrepareReturn(q.quarter)}
                        disabled={isCurrentAction}
                        className="table-action"
                      >
                        {isCurrentAction ? "..." : "Voorbereiden"}
                      </button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      ) : (
        <p className="empty-state">
          Nog geen gegevens
        </p>
      )}

      <div className="p-4 md:p-5 bg-foreground/2 font-mono text-[11px] font-normal leading-[1.6]">
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
