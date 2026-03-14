"use client";

import { useQuery } from "@tanstack/react-query";
import { getBtwOverview } from "@/lib/actions/tax";
import type { QuarterStats } from "@/lib/actions/tax";

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
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-lg)",
            fontWeight: 900,
            letterSpacing: "var(--tracking-display)",
            lineHeight: 1,
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
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 24,
            marginBottom: 48,
          }}
          className="stat-cards-grid"
        >
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : current ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 24,
            marginBottom: 48,
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
      ) : null}

      {/* Section 3: Quarterly table */}
      {isLoading ? (
        <SkeletonTable />
      ) : quarters.length > 0 ? (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-md)",
            marginBottom: 48,
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--foreground)",
                textAlign: "left",
              }}
            >
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
              <tr key={q.quarter} style={{ borderBottom: "var(--border)" }}>
                <Td style={{ fontWeight: 500 }}>{q.quarter}</Td>
                <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrency(q.revenueExVat)}
                </Td>
                <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrency(q.outputVat)}
                </Td>
                <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrency(q.inputVat)}
                </Td>
                <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrency(q.netVat)}
                </Td>
                <Td>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 500,
                      letterSpacing: "0.02em",
                      padding: "4px 0",
                      border: "none",
                      borderBottom: "var(--border-rule)",
                      display: "inline-block",
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
            fontSize: "var(--text-body-lg)",
            fontWeight: 300,
            opacity: 0.5,
            marginBottom: 48,
          }}
        >
          Nog geen gegevens beschikbaar.
        </p>
      )}

      {/* Section 4: Disclaimer */}
      <div
        style={{
          padding: "12px 16px",
          border: "none",
          borderLeft: "2px solid var(--foreground)",
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-md)",
          fontWeight: 400,
        }}
      >
        Dit overzicht is indicatief. Dien je BTW-aangifte in via het portaal van
        de Belastingdienst. Bewaar je facturen en bonnen minimaal 7 jaar.
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        border: "none",
        borderTop: "var(--border-rule)",
        padding: "24px 0",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.02em",
          margin: "0 0 8px",
          opacity: 0.6,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "2.5rem",
          fontWeight: 900,
          lineHeight: 1,
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      style={{
        border: "none",
        borderTop: "var(--border-rule)",
        padding: "24px 0",
        opacity: 0.12,
      }}
    >
      <div className="skeleton" style={{ width: "60%", height: 9, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: "80%", height: 32 }} />
    </div>
  );
}

function SkeletonTable() {
  return (
    <div style={{ opacity: 0.12, marginBottom: 48 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr",
          gap: 12,
          padding: "10px 12px",
          borderBottom: "1px solid var(--foreground)",
        }}
      >
        {[60, 80, 70, 70, 60, 50].map((w, i) => (
          <div key={i} className="skeleton" style={{ width: `${w}%`, height: 9 }} />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, row) => (
        <div
          key={row}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr",
            gap: 12,
            padding: "12px 12px",
            borderBottom: "1px solid rgba(13, 13, 11, 0.08)",
          }}
        >
          {[50, 70, 60, 60, 50, 40].map((w, i) => (
            <div key={i} className="skeleton" style={{ width: `${w}%`, height: 13 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Th({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <th
      style={{
        fontWeight: 500,
        fontSize: "var(--text-body-sm)",
        letterSpacing: "0.02em",
        padding: "12px 8px",
        ...style,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <td
      style={{
        padding: "12px 8px",
        fontWeight: 300,
        ...style,
      }}
    >
      {children}
    </td>
  );
}
