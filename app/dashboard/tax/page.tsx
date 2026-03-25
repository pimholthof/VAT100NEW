"use client";

import { useQuery } from "@tanstack/react-query";
import { getBtwOverview, getTaxProjection } from "@/features/tax/actions";
import { getDashboardData } from "@/features/dashboard/actions";
import type { QuarterStats } from "@/features/tax/actions";
import type { Bespaartip, DepreciationRow } from "@/lib/tax/dutch-tax-2026";
import { SkeletonCard, SkeletonTable, Th, Td } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { TAX_CONSTANTS } from "@/lib/tax/dutch-tax-2026";

export default function TaxPage() {
  const { data: btwResult, isLoading: btwLoading } = useQuery({
    queryKey: ["btw-overview"],
    queryFn: () => getBtwOverview(),
  });

  const { data: taxResult, isLoading: taxLoading } = useQuery({
    queryKey: ["tax-projection"],
    queryFn: () => getTaxProjection(),
  });

  const { data: dashResult } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
  });

  const quarters = btwResult?.data ?? [];
  const current = quarters.length > 0 ? quarters[0] : null;
  const projection = taxResult?.data ?? null;
  const vatDeadline = dashResult?.data?.vatDeadline;

  const now = new Date();
  const isLoading = btwLoading || taxLoading;

  return (
    <div>
      {/* ══ HEADER ══ */}
      <div className="page-header" style={{ marginBottom: 80 }}>
        <div>
          <h1 className="display-title">Belasting</h1>
          <p style={{ fontSize: "var(--text-body-lg)", fontWeight: 300, margin: "16px 0 0", opacity: 0.5 }}>
            Overzicht van je geschatte inkomstenbelasting en BTW
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
          Download lijst
        </a>
      </div>

      {/* ══════════════════════════════════════════════════
          ZONE 1: INKOMSTENBELASTING
      ══════════════════════════════════════════════════ */}

      <h2 className="section-header" style={{ margin: "0 0 8px" }}>
        Inkomstenbelasting {now.getFullYear()}
      </h2>
      <p className="label" style={{ margin: "0 0 24px", opacity: 0.4 }}>
        Schatting op basis van je huidige omzet en kosten
      </p>

      {/* Hero: geschatte inkomstenbelasting */}
      {isLoading ? (
        <SkeletonCard />
      ) : projection ? (
        <div style={{ marginBottom: "var(--space-block)" }}>
          <p className="label" style={{ margin: "0 0 16px", opacity: 0.3 }}>
            Geschatte inkomstenbelasting {now.getFullYear()}
          </p>
          <p style={{
            fontSize: "var(--text-display-xl)",
            fontWeight: 700,
            lineHeight: 0.85,
            letterSpacing: "var(--tracking-display)",
            margin: 0,
          }}>
            {formatCurrency(Math.round(projection.nettoIB))}
          </p>
          <p style={{
            fontSize: "var(--text-body-sm)",
            fontWeight: 300,
            opacity: 0.45,
            margin: "12px 0 0",
          }}>
            Gemiddeld belastingpercentage: {projection.effectiefTarief.toFixed(1)}%
          </p>
        </div>
      ) : null}

      {/* Berekening */}
      {projection && (
        <div style={{ marginBottom: "var(--space-block)" }}>
          <div style={{
            background: "var(--background)",
            border: "0.5px solid rgba(13,13,11,0.08)",
            padding: 24,
          }}>
            <BreakdownSection title="Winstberekening">
              <BreakdownLine label="Omzet (excl. BTW)" value={projection.brutoOmzet} />
              <BreakdownLine label="Kosten" value={-projection.kosten} negative />
              <BreakdownLine label="Afschrijvingen" value={-projection.afschrijvingen} negative />
              <BreakdownTotal label="Winst voor aftrekposten" value={projection.brutoWinst} />
            </BreakdownSection>

            <BreakdownSection title="Aftrekposten">
              <BreakdownLine label="Aftrek voor zelfstandigen" value={-projection.zelfstandigenaftrek} negative />
              <BreakdownLine
                label={`Winstvrijstelling kleine ondernemers (${(TAX_CONSTANTS.mkbVrijstellingRate * 100).toFixed(1)}%)`}
                value={-projection.mkbVrijstelling}
                negative
              />
              {projection.kia > 0 && (
                <BreakdownLine
                  label={`Investeringsaftrek (${(TAX_CONSTANTS.kiaTier1Rate * 100)}% over ${formatCurrency(projection.totalInvestments)})`}
                  value={-projection.kia}
                  negative
                />
              )}
              <BreakdownTotal label="Inkomen waarover je belasting betaalt" value={projection.belastbaarInkomen} />
            </BreakdownSection>

            <BreakdownSection title="Belasting">
              <BreakdownLine label="Inkomstenbelasting" value={projection.inkomstenbelasting} />
              <BreakdownLine label="Belastingkorting (algemeen)" value={-projection.algemeneHeffingskorting} negative />
              <BreakdownLine label="Belastingkorting (arbeid)" value={-projection.arbeidskorting} negative />
              <BreakdownTotal label="Geschatte inkomstenbelasting" value={projection.nettoIB} highlight />
            </BreakdownSection>
          </div>
        </div>
      )}

      {/* Tips om belasting te besparen */}
      {projection && projection.bespaartips.length > 0 && (
        <div style={{ marginBottom: "var(--space-block)" }}>
          <h3 className="section-header" style={{ margin: "0 0 16px" }}>
            Tips om belasting te besparen
          </h3>
          <div className="responsive-grid-2" style={{ gap: 1, background: "rgba(13,13,11,0.08)" }}>
            {projection.bespaartips.map((tip, i) => (
              <TipCard key={i} tip={tip} />
            ))}
          </div>
        </div>
      )}

      {/* Investeringen & afschrijvingen */}
      {projection && projection.afschrijvingDetails.length > 0 && (
        <div style={{ marginBottom: "var(--space-section)" }}>
          <h3 className="section-header" style={{ margin: "0 0 16px" }}>
            Investeringen & afschrijvingen
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "var(--space-block)" }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
                <Th>Omschrijving</Th>
                <Th style={{ textAlign: "right" }}>Aanschafprijs</Th>
                <Th style={{ textAlign: "right" }}>Afschrijving/jaar</Th>
                <Th style={{ textAlign: "right" }}>Boekwaarde</Th>
                <Th>Resterend</Th>
              </tr>
            </thead>
            <tbody>
              {projection.afschrijvingDetails.map((row) => (
                <DepreciationTableRow key={row.id} row={row} />
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "0.5px solid rgba(13,13,11,0.15)" }}>
                <Td><span className="label-strong">Totaal</span></Td>
                <Td style={{ textAlign: "right" }}>
                  <span className="mono-amount">{formatCurrency(projection.afschrijvingDetails.reduce((s, r) => s + r.aanschafprijs, 0))}</span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span className="mono-amount">{formatCurrency(projection.afschrijvingen)}</span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span className="mono-amount">{formatCurrency(projection.afschrijvingDetails.reduce((s, r) => s + r.boekwaarde, 0))}</span>
                </Td>
                <Td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ZONE 2: BTW (OMZETBELASTING)
      ══════════════════════════════════════════════════ */}

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        flexWrap: "wrap",
        gap: 8,
        margin: "0 0 24px",
      }}>
        <h2 className="section-header" style={{ margin: 0 }}>BTW (omzetbelasting)</h2>
        {vatDeadline && (
          <p className="label" style={{ margin: 0, opacity: 0.5 }}>
            Volgende aangifte: {vatDeadline.quarter} — {vatDeadline.daysRemaining} dagen
          </p>
        )}
      </div>

      {/* Hero: netto BTW dit kwartaal */}
      {btwLoading ? (
        <SkeletonCard />
      ) : current ? (
        <div style={{ marginBottom: "var(--space-block)" }}>
          <p className="label" style={{ margin: "0 0 16px", opacity: 0.3 }}>
            {current.netVat >= 0 ? "Te betalen dit kwartaal" : "Terug te vorderen dit kwartaal"}
          </p>
          <p style={{
            fontSize: "var(--text-display-xl)",
            fontWeight: 700,
            lineHeight: 0.85,
            letterSpacing: "var(--tracking-display)",
            margin: 0,
          }}>
            {formatCurrency(Math.abs(current.netVat))}
          </p>
        </div>
      ) : null}

      {/* Kwartaaloverzicht */}
      <h3 className="section-header" style={{ margin: "0 0 16px" }}>Kwartaaloverzicht</h3>

      {btwLoading ? (
        <SkeletonTable columns="1fr 1fr 1fr 1fr 1fr 1fr" rows={4} headerWidths={[60, 80, 70, 70, 60, 50]} bodyWidths={[50, 70, 60, 60, 50, 40]} />
      ) : quarters.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "var(--space-block)" }}>
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
              <Th>Kwartaal</Th>
              <Th style={{ textAlign: "right" }}>Omzet</Th>
              <Th style={{ textAlign: "right" }}>BTW ontvangen</Th>
              <Th style={{ textAlign: "right" }}>BTW terugvraagbaar</Th>
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
        <p className="empty-state">Nog geen gegevens</p>
      )}

      {/* ══ DISCLAIMER ══ */}
      <div style={{ padding: 20, background: "rgba(13,13,11,0.02)", fontSize: 11, fontWeight: 400, lineHeight: 1.6 }}>
        Dit is een schatting op basis van je facturen en bonnetjes.
        Doe je officiële BTW-aangifte via de Belastingdienst.
        Bewaar je administratie minimaal 7 jaar.
        Berekeningen op basis van belastingtarieven {TAX_CONSTANTS.year}.
      </div>
    </div>
  );
}

// ─── Subcomponenten ───

function TipCard({ tip }: { tip: Bespaartip }) {
  return (
    <div style={{ background: "var(--background)", padding: 20 }}>
      <p className="label-strong" style={{ margin: "0 0 6px" }}>{tip.titel}</p>
      <p style={{ fontSize: "var(--text-body-sm)", fontWeight: 300, margin: "0 0 8px", lineHeight: 1.5 }}>
        {tip.beschrijving}
      </p>
      {tip.besparing > 0 && (
        <p className="mono-amount" style={{ margin: 0, opacity: 0.7, fontSize: "var(--text-body-xs)" }}>
          Geschatte besparing: {formatCurrency(Math.round(tip.besparing))}
        </p>
      )}
    </div>
  );
}

function DepreciationTableRow({ row }: { row: DepreciationRow }) {
  return (
    <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
      <Td>
        <span className="label">{row.omschrijving}</span>
        <br />
        <span style={{ fontSize: "var(--text-body-xs)", opacity: 0.4 }}>
          {new Date(row.aanschafDatum).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </Td>
      <Td style={{ textAlign: "right" }}><span className="mono-amount">{formatCurrency(row.aanschafprijs)}</span></Td>
      <Td style={{ textAlign: "right" }}><span className="mono-amount">{formatCurrency(row.jaarAfschrijving)}</span></Td>
      <Td style={{ textAlign: "right" }}><span className="mono-amount">{formatCurrency(row.boekwaarde)}</span></Td>
      <Td><span className="label" style={{ opacity: 0.6 }}>{row.resterendeJaren} jaar</span></Td>
    </tr>
  );
}

// ─── Breakdown componenten ───

function BreakdownSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p className="label" style={{ margin: "0 0 10px", opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 10 }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function BreakdownLine({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "var(--text-body-sm)" }}>
      <span style={{ fontWeight: 300, opacity: 0.7 }}>{label}</span>
      <span className="mono-amount" style={{ opacity: negative ? 0.5 : 0.9 }}>
        {negative && value !== 0 ? "−" : ""}{formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}

function BreakdownTotal({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      padding: "8px 0 4px",
      borderTop: "0.5px solid rgba(13,13,11,0.12)",
      marginTop: 4,
    }}>
      <span style={{ fontWeight: 500, fontSize: "var(--text-body-sm)" }}>{label}</span>
      <span
        className="mono-amount"
        style={{
          fontWeight: highlight ? 700 : 600,
          fontSize: highlight ? "var(--text-body-lg)" : "var(--text-body-sm)",
        }}
      >
        {formatCurrency(Math.round(value))}
      </span>
    </div>
  );
}
