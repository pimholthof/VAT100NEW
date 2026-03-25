"use client";

import { useQuery } from "@tanstack/react-query";
import { getBtwOverview } from "@/features/tax/actions";
import { getDashboardData } from "@/features/dashboard/actions";
import type { QuarterStats } from "@/features/tax/actions";
import { StatCard, SkeletonCard, SkeletonTable, Th, Td } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

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

  // Year-end IB projection
  const now = new Date();
  const monthsElapsed = now.getMonth() + 1;
  const yearRevenueExVat = quarters
    .filter((q) => q.quarter.includes(String(now.getFullYear())))
    .reduce((sum, q) => sum + q.revenueExVat, 0);
  const annualizedRevenue = (yearRevenueExVat / monthsElapsed) * 12;
  const zelfstandigenaftrek = 5030;
  const mkbVrijstelling = annualizedRevenue * 0.14;
  const taxableProfit = Math.max(0, annualizedRevenue - zelfstandigenaftrek - mkbVrijstelling);
  let estimatedIB = 0;
  if (taxableProfit <= 75518) {
    estimatedIB = taxableProfit * 0.3693;
  } else {
    estimatedIB = 75518 * 0.3693 + (taxableProfit - 75518) * 0.4950;
  }

  const yearBtw = quarters
    .filter((q) => q.quarter.includes(String(now.getFullYear())))
    .reduce((sum, q) => sum + q.netVat, 0);

  return (
    <div>
      {/* Title */}
      <div className="page-header" style={{ marginBottom: 80 }}>
        <div>
          <h1 className="display-title">Belasting</h1>
          <p style={{ fontSize: "var(--text-body-lg)", fontWeight: 300, margin: "16px 0 0", opacity: 0.5 }}>
            Alles over je BTW en inkomstenbelasting
          </p>
        </div>
        <a
          href="/api/export/btw"
          download
          className="label-strong"
          style={{
            padding: "14px 24px",
            border: "0.5px solid rgba(13,13,11,0.25)",
            background: "transparent",
            color: "var(--foreground)",
            textDecoration: "none",
            display: "inline-block",
            transition: "opacity 0.2s ease",
          }}
        >
          Exporteer CSV
        </a>
      </div>

      {/* Jaar Prognose */}
      <div
        className="stat-cards-grid responsive-grid-3"
        style={{
          background: "rgba(13,13,11,0.08)",
          border: "0.5px solid rgba(13,13,11,0.08)",
          marginBottom: "var(--space-section)",
          gap: 1,
        }}
      >
        <YearCard
          label={`Geschatte IB ${now.getFullYear()}`}
          value={formatCurrency(Math.round(estimatedIB))}
          sublabel={`Belastbaar: ${formatCurrency(Math.round(taxableProfit))}`}
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

      {/* ZZP Aftrekposten */}
      <div style={{ marginBottom: "var(--space-section)" }}>
        <h2 className="section-header" style={{ margin: "0 0 16px" }}>
          Jouw aftrekposten
        </h2>
        <div className="responsive-grid-3">
          <DeductionItem label="Zelfstandigenaftrek" value={formatCurrency(zelfstandigenaftrek)} note="1.225+ uur per jaar" />
          <DeductionItem label="MKB-winstvrijstelling" value={formatCurrency(Math.round(mkbVrijstelling))} note="14% van de winst" />
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

      {/* BTW Deadline */}
      {vatDeadline && (
        <div className="page-header" style={{ marginBottom: "var(--space-section)", padding: 20, border: "0.5px solid rgba(13,13,11,0.08)" }}>
          <div>
            <p className="label" style={{ opacity: 0.5, margin: "0 0 4px" }}>Volgende BTW-aangifte</p>
            <p style={{ fontSize: "var(--text-body-lg)", fontWeight: 500, margin: 0 }}>
              {vatDeadline.quarter} — {vatDeadline.deadline}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "var(--text-display-md)", fontWeight: 700, letterSpacing: "var(--tracking-display)", margin: "0 0 4px" }}>
              {vatDeadline.daysRemaining}d
            </p>
            <p className="label" style={{ opacity: 0.5, margin: 0 }}>
              {formatCurrency(vatDeadline.estimatedAmount)}
            </p>
          </div>
        </div>
      )}

      {/* Hero: Netto BTW dit kwartaal */}
      {!isLoading && current && (
        <div style={{ marginBottom: "var(--space-section)" }}>
          <p className="label" style={{ margin: "0 0 16px", opacity: 0.3 }}>
            {current.netVat >= 0 ? "Te betalen dit kwartaal" : "Te vorderen dit kwartaal"}
          </p>
          <p style={{ fontSize: "var(--text-display-xl)", fontWeight: 700, lineHeight: 0.85, letterSpacing: "var(--tracking-display)", margin: 0 }}>
            {formatCurrency(Math.abs(current.netVat))}
          </p>
        </div>
      )}

      {/* Stat cards */}
      {isLoading ? (
        <div className="editorial-divider" style={{ marginBottom: "var(--space-block)" }}>
          <div className="stat-cards-grid responsive-grid-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ) : current ? (
        <div className="editorial-divider" style={{ marginBottom: "var(--space-section)" }}>
          <div className="stat-cards-grid responsive-grid-3">
            <StatCard label="Output BTW" value={formatCurrency(current.outputVat)} />
            <StatCard label="Aftrekbare BTW" value={formatCurrency(current.inputVat)} />
            <StatCard label="Aantal facturen" value={String(current.invoiceCount)} />
          </div>
        </div>
      ) : null}

      {/* Quarterly table */}
      <h2 className="section-header" style={{ margin: "0 0 16px" }}>Kwartaaloverzicht</h2>

      {isLoading ? (
        <SkeletonTable columns="1fr 1fr 1fr 1fr 1fr 1fr" rows={4} headerWidths={[60, 80, 70, 70, 60, 50]} bodyWidths={[50, 70, 60, 60, 50, 40]} />
      ) : quarters.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "var(--space-block)" }}>
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
              <Th>Kwartaal</Th>
              <Th style={{ textAlign: "right" }}>Omzet excl. BTW</Th>
              <Th style={{ textAlign: "right" }}>Output BTW</Th>
              <Th style={{ textAlign: "right" }}>Aftrekbare BTW</Th>
              <Th style={{ textAlign: "right" }}>Netto BTW</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {quarters.map((q: QuarterStats) => (
              <tr key={q.quarter} style={{ borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
                <Td><span className="mono-amount">{q.quarter}</span></Td>
                <Td style={{ textAlign: "right" }}><span className="mono-amount">{formatCurrency(q.revenueExVat)}</span></Td>
                <Td style={{ textAlign: "right" }}><span className="mono-amount">{formatCurrency(q.outputVat)}</span></Td>
                <Td style={{ textAlign: "right" }}><span className="mono-amount">{formatCurrency(q.inputVat)}</span></Td>
                <Td style={{ textAlign: "right" }}><span className="mono-amount">{formatCurrency(q.netVat)}</span></Td>
                <Td><span className="label" style={{ opacity: 1 }}>{q.netVat >= 0 ? "Te betalen" : "Te vorderen"}</span></Td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="empty-state">Nog geen gegevens beschikbaar</p>
      )}

      {/* Disclaimer */}
      <div style={{ padding: 20, background: "rgba(13,13,11,0.02)", fontSize: 11, fontWeight: 400, lineHeight: 1.6 }}>
        Dit overzicht is indicatief. Dien je BTW-aangifte in via het portaal van
        de Belastingdienst. Bewaar je facturen en bonnen minimaal 7 jaar.
        Inkomstenbelastingschatting is gebaseerd op 36,93% schijf 1 en 49,50% schijf 2 (2024).
        Zelfstandigenaftrek (€5.030) en MKB-winstvrijstelling (14%) zijn meegenomen.
      </div>
    </div>
  );
}

function YearCard({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return (
    <div style={{ background: "var(--background)", padding: 20 }}>
      <p className="label" style={{ margin: "0 0 8px", opacity: 0.55 }}>{label}</p>
      <p style={{ fontSize: "var(--text-display-sm)", fontWeight: 700, letterSpacing: "var(--tracking-display)", margin: "0 0 4px" }}>
        {value}
      </p>
      <p style={{ fontSize: "var(--text-body-xs)", fontWeight: 300, opacity: 0.45, margin: 0 }}>{sublabel}</p>
    </div>
  );
}

function DeductionItem({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <p className="label" style={{ margin: "0 0 4px", opacity: 0.55 }}>{label}</p>
      <p className="mono-amount" style={{ margin: "0 0 2px" }}>{value}</p>
      <p style={{ fontSize: "var(--text-body-xs)", fontWeight: 300, opacity: 0.4, margin: 0 }}>{note}</p>
    </div>
  );
}
