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
      {/* Section 1: Title */}
      <div style={{ marginBottom: 64 }}>
        <h1
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-lg)",
            fontWeight: 900,
            letterSpacing: "var(--tracking-display)",
            lineHeight: 0.9,
            margin: 0,
          }}
        >
          Belasting
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-lg)",
            fontWeight: 300,
            margin: "12px 0 0",
          }}
        >
          BTW-overzicht per kwartaal
        </p>
      </div>

      {/* Section 2: Stat cards for current quarter */}
      {isLoading ? (
        <div
          style={{
            borderTop: "0.5px solid rgba(13,13,11,0.15)",
            marginBottom: 48,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 24,
            }}
            className="stat-cards-grid"
          >
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ) : current ? (
        <div
          style={{
            borderTop: "0.5px solid rgba(13,13,11,0.15)",
            marginBottom: 48,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 24,
            }}
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
              label={current.netVat >= 0 ? "Te betalen" : "Te vorderen"}
              value={formatCurrency(Math.abs(current.netVat))}
            />
            <StatCard
              label="Aantal facturen"
              value={String(current.invoiceCount)}
            />
          </div>
        </div>
      ) : null}

      {/* Section 3: Quarterly table */}
      {isLoading ? (
        <div style={{ marginBottom: 48 }}>
          <SkeletonTable
            columns="1fr 1fr 1fr 1fr 1fr 1fr"
            rows={4}
            headerWidths={[60, 80, 70, 70, 60, 50]}
            bodyWidths={[50, 70, 60, 60, 50, 40]}
          />
        </div>
      ) : quarters.length > 0 ? (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: 48,
          }}
        >
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
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "var(--text-mono-md)" }}>
                    {q.quarter}
                  </span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "var(--text-mono-md)", fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(q.revenueExVat)}
                  </span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "var(--text-mono-md)", fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(q.outputVat)}
                  </span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "var(--text-mono-md)", fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(q.inputVat)}
                  </span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "var(--text-mono-md)", fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(q.netVat)}
                  </span>
                </Td>
                <Td>
                  <span
                    style={{
                      fontSize: "var(--text-label)",
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {q.netVat >= 0 ? "Te betalen" : "Te vorderen"}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "13px",
            fontWeight: 300,
            opacity: 0.3,
            marginBottom: 48,
            paddingTop: 48,
          }}
        >
          Nog geen gegevens beschikbaar.
        </p>
      )}

      {/* Section 4: Disclaimer */}
      <div
        style={{
          padding: 16,
          background: "rgba(13,13,11,0.02)",
          fontFamily: "var(--font-mono), monospace",
          fontSize: "11px",
          fontWeight: 400,
        }}
      >
        Dit overzicht is indicatief. Dien je BTW-aangifte in via het portaal van
        de Belastingdienst. Bewaar je facturen en bonnen minimaal 7 jaar.
      </div>
    </div>
  );
}
