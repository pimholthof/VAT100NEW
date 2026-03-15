"use client";

import { useQuery } from "@tanstack/react-query";
import { getBtwOverview } from "@/lib/actions/tax";
import type { QuarterStats } from "@/lib/actions/tax";
import { StatCard, SkeletonCard, SkeletonTable, Th, Td } from "@/components/ui";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export default function TaxPage() {
  const { data: result, isLoading } = useQuery({
    queryKey: ["btw-overview"],
    queryFn: () => getBtwOverview(),
  });

  const quarters = result?.data ?? [];
  const current = quarters.length > 0 ? quarters[0] : null;

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: 80 }}>
        <h1 className="display-title">
          Belasting
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-lg)",
            fontWeight: 300,
            margin: "16px 0 0",
            opacity: 0.5,
          }}
        >
          BTW-overzicht per kwartaal
        </p>
      </div>

      {/* Hero: Netto BTW dit kwartaal */}
      {!isLoading && current && (
        <div style={{ marginBottom: "var(--space-section)" }}>
          <p className="label" style={{ margin: "0 0 16px", opacity: 0.3 }}>
            {current.netVat >= 0 ? "Te betalen dit kwartaal" : "Te vorderen dit kwartaal"}
          </p>
          <p
            style={{
              fontFamily: "var(--font-display), sans-serif",
              fontSize: "var(--text-display-xl)",
              fontWeight: 900,
              lineHeight: 0.85,
              letterSpacing: "var(--tracking-display)",
              margin: 0,
            }}
          >
            {formatCurrency(Math.abs(current.netVat))}
          </p>
        </div>
      )}

      {/* Stat cards */}
      {isLoading ? (
        <div className="editorial-divider" style={{ marginBottom: "var(--space-block)" }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-element)" }}
            className="stat-cards-grid"
          >
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ) : current ? (
        <div className="editorial-divider" style={{ marginBottom: "var(--space-section)" }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-element)" }}
            className="stat-cards-grid"
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

      {/* Quarterly table */}
      <h2 className="section-header" style={{ margin: "0 0 16px" }}>
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
                <Td style={{ fontWeight: 400 }}>
                  <span className="mono-amount">{q.quarter}</span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span className="mono-amount">{formatCurrency(q.revenueExVat)}</span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span className="mono-amount">{formatCurrency(q.outputVat)}</span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span className="mono-amount">{formatCurrency(q.inputVat)}</span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span className="mono-amount">{formatCurrency(q.netVat)}</span>
                </Td>
                <Td>
                  <span className="label" style={{ opacity: 1 }}>
                    {q.netVat >= 0 ? "Te betalen" : "Te vorderen"}
                  </span>
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

      {/* Disclaimer */}
      <div
        style={{
          padding: 20,
          background: "rgba(13,13,11,0.02)",
          fontFamily: "var(--font-mono), monospace",
          fontSize: "11px",
          fontWeight: 400,
          lineHeight: 1.6,
        }}
      >
        Dit overzicht is indicatief. Dien je BTW-aangifte in via het portaal van
        de Belastingdienst. Bewaar je facturen en bonnen minimaal 7 jaar.
      </div>
    </div>
  );
}
