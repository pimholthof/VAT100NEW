"use client";

import { useQuery } from "@tanstack/react-query";
import { getBtwOverview, getTaxProjection } from "@/features/tax/actions";
import { getDashboardData } from "@/features/dashboard/actions";
import type { QuarterStats } from "@/features/tax/actions";
import type { Bespaartip, DepreciationRow } from "@/lib/tax/dutch-tax-2026";
import { StatCard, SkeletonCard, SkeletonTable, Th, Td } from "@/components/ui";
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
  const yearBtw = quarters
    .filter((q) => q.quarter.includes(String(now.getFullYear())))
    .reduce((sum, q) => sum + q.netVat, 0);

  const isLoading = btwLoading || taxLoading;

  return (
    <div>
      {/* Title */}
      <div className="page-header" style={{ marginBottom: 80 }}>
        <div>
          <h1 className="display-title">Belasting</h1>
          <p style={{ fontSize: "var(--text-body-lg)", fontWeight: 300, margin: "16px 0 0", opacity: 0.5 }}>
            Real-time inzicht in je IB, BTW, aftrekposten en besparingen
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

      {/* ── Sectie 1: Jaarprognose Hero ── */}
      {isLoading ? (
        <div className="stat-cards-grid responsive-grid-3" style={{ marginBottom: "var(--space-section)" }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : projection ? (
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
            label={`Te betalen IB ${now.getFullYear()}`}
            value={formatCurrency(Math.round(projection.nettoIB))}
            sublabel={`Effectief tarief: ${projection.effectiefTarief.toFixed(1)}%`}
          />
          <YearCard
            label={`BTW totaal ${now.getFullYear()}`}
            value={formatCurrency(Math.round(yearBtw))}
            sublabel={`${quarters.filter((q) => q.quarter.includes(String(now.getFullYear()))).length} kwartalen`}
          />
          <YearCard
            label="Jaarprognose IB"
            value={formatCurrency(Math.round(projection.prognoseJaarIB))}
            sublabel={`Bij prognose omzet ${formatCurrency(Math.round(projection.prognoseJaarOmzet))}`}
          />
        </div>
      ) : null}

      {/* ── Sectie 2: Belastingberekening Breakdown ── */}
      {projection && (
        <div style={{ marginBottom: "var(--space-section)" }}>
          <h2 className="section-header" style={{ margin: "0 0 16px" }}>
            Berekening inkomstenbelasting {now.getFullYear()}
          </h2>
          <div style={{ background: "var(--background)", border: "0.5px solid rgba(13,13,11,0.08)", padding: 24 }}>
            <BreakdownSection title="Winstberekening">
              <BreakdownLine label="Omzet (ex BTW)" value={projection.brutoOmzet} />
              <BreakdownLine label="Kosten" value={-projection.kosten} negative />
              <BreakdownLine label="Afschrijvingen" value={-projection.afschrijvingen} negative />
              <BreakdownTotal label="Bruto winst" value={projection.brutoWinst} />
            </BreakdownSection>

            <BreakdownSection title="Aftrekposten">
              <BreakdownLine label={`Zelfstandigenaftrek`} value={-projection.zelfstandigenaftrek} negative />
              <BreakdownLine label={`MKB-winstvrijstelling (${(TAX_CONSTANTS.mkbVrijstellingRate * 100).toFixed(1)}%)`} value={-projection.mkbVrijstelling} negative />
              {projection.kia > 0 && (
                <BreakdownLine label={`KIA (${(TAX_CONSTANTS.kiaTier1Rate * 100)}% over ${formatCurrency(projection.totalInvestments)})`} value={-projection.kia} negative />
              )}
              <BreakdownTotal label="Belastbaar inkomen" value={projection.belastbaarInkomen} />
            </BreakdownSection>

            <BreakdownSection title="Belasting">
              <BreakdownLine label="Inkomstenbelasting (box 1)" value={projection.inkomstenbelasting} />
              <BreakdownLine label="Algemene heffingskorting" value={-projection.algemeneHeffingskorting} negative />
              <BreakdownLine label="Arbeidskorting" value={-projection.arbeidskorting} negative />
              <BreakdownTotal label="Te betalen IB" value={projection.nettoIB} highlight />
            </BreakdownSection>
          </div>
        </div>
      )}

      {/* ── Sectie 3: Bespaartips ── */}
      {projection && projection.bespaartips.length > 0 && (
        <div style={{ marginBottom: "var(--space-section)" }}>
          <h2 className="section-header" style={{ margin: "0 0 16px" }}>
            Bespaartips
          </h2>
          <div className="responsive-grid-2" style={{ gap: 1, background: "rgba(13,13,11,0.08)" }}>
            {projection.bespaartips.map((tip, i) => (
              <TipCard key={i} tip={tip} />
            ))}
          </div>
        </div>
      )}

      {/* ── Sectie 4: Aftrekposten overzicht ── */}
      {projection && (
        <div style={{ marginBottom: "var(--space-section)" }}>
          <h2 className="section-header" style={{ margin: "0 0 16px" }}>
            Jouw aftrekposten
          </h2>
          <div className="responsive-grid-3">
            <DeductionItem
              label="Zelfstandigenaftrek"
              value={formatCurrency(TAX_CONSTANTS.zelfstandigenaftrek)}
              note="1.225+ uur per jaar"
            />
            <DeductionItem
              label="MKB-winstvrijstelling"
              value={formatCurrency(Math.round(projection.mkbVrijstelling))}
              note={`${(TAX_CONSTANTS.mkbVrijstellingRate * 100).toFixed(1)}% van winst na aftrek`}
            />
            <DeductionItem
              label="KIA (investeringsaftrek)"
              value={formatCurrency(Math.round(projection.kia))}
              note={projection.totalInvestments > 0
                ? `Over ${formatCurrency(projection.totalInvestments)} investeringen`
                : `Vanaf ${formatCurrency(TAX_CONSTANTS.kiaMinTotal)} aan investeringen`}
            />
            <DeductionItem
              label="Algemene heffingskorting"
              value={formatCurrency(Math.round(projection.algemeneHeffingskorting))}
              note={`Max ${formatCurrency(TAX_CONSTANTS.ahkMax)}`}
            />
            <DeductionItem
              label="Arbeidskorting"
              value={formatCurrency(Math.round(projection.arbeidskorting))}
              note={`Max ${formatCurrency(TAX_CONSTANTS.akMax)}`}
            />
            <DeductionItem
              label="Terug te vragen BTW"
              value={formatCurrency(
                quarters
                  .filter((q) => q.quarter.includes(String(now.getFullYear())))
                  .reduce((sum, q) => sum + q.inputVat, 0)
              )}
              note="Via je bonnetjes"
            />
          </div>
        </div>
      )}

      {/* ── Sectie 5: Investeringen & Afschrijvingen ── */}
      {projection && projection.afschrijvingDetails.length > 0 && (
        <div style={{ marginBottom: "var(--space-section)" }}>
          <h2 className="section-header" style={{ margin: "0 0 16px" }}>
            Investeringen & afschrijvingen
          </h2>
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

      {/* ── BTW Deadline ── */}
      {vatDeadline && (
        <div className="page-header" style={{ marginBottom: "var(--space-section)", padding: 20, border: "0.5px solid rgba(13,13,11,0.08)" }}>
          <div>
            <p className="label" style={{ opacity: 0.5, margin: "0 0 4px" }}>Volgende BTW-aangifte</p>
            <p style={{ fontSize: "var(--text-body-lg)", fontWeight: 500, margin: 0 }}>
              {vatDeadline.quarter} — uiterlijk {vatDeadline.deadline}
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

      {/* ── Hero: Netto BTW dit kwartaal ── */}
      {!btwLoading && current && (
        <div style={{ marginBottom: "var(--space-section)" }}>
          <p className="label" style={{ margin: "0 0 16px", opacity: 0.3 }}>
            {current.netVat >= 0 ? "BTW te betalen dit kwartaal" : "BTW terug te vorderen"}
          </p>
          <p style={{ fontSize: "var(--text-display-xl)", fontWeight: 700, lineHeight: 0.85, letterSpacing: "var(--tracking-display)", margin: 0 }}>
            {formatCurrency(Math.abs(current.netVat))}
          </p>
        </div>
      )}

      {/* ── Stat cards ── */}
      {btwLoading ? (
        <div className="editorial-divider" style={{ marginBottom: "var(--space-block)" }}>
          <div className="stat-cards-grid responsive-grid-3">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
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

      {/* ── Kwartaaloverzicht ── */}
      <h2 className="section-header" style={{ margin: "0 0 16px" }}>Kwartaaloverzicht</h2>

      {btwLoading ? (
        <SkeletonTable columns="1fr 1fr 1fr 1fr 1fr 1fr" rows={4} headerWidths={[60, 80, 70, 70, 60, 50]} bodyWidths={[50, 70, 60, 60, 50, 40]} />
      ) : quarters.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "var(--space-block)" }}>
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
              <Th>Kwartaal</Th>
              <Th style={{ textAlign: "right" }}>Omzet</Th>
              <Th style={{ textAlign: "right" }}>BTW ontvangen</Th>
              <Th style={{ textAlign: "right" }}>BTW terug</Th>
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

      {/* ── Disclaimer ── */}
      <div style={{ padding: 20, background: "rgba(13,13,11,0.02)", fontSize: 11, fontWeight: 400, lineHeight: 1.6 }}>
        Dit overzicht is indicatief. Doe je BTW-aangifte via het portaal van de Belastingdienst.
        Bewaar je facturen en bonnen minimaal 7 jaar.
        Berekeningen zijn gebaseerd op tarieven {TAX_CONSTANTS.year}:
        {" "}box 1 schijven {TAX_CONSTANTS.box1Brackets.map(b => `${(b.rate * 100).toFixed(2)}%`).join(" / ")},
        {" "}zelfstandigenaftrek €{TAX_CONSTANTS.zelfstandigenaftrek.toLocaleString("nl-NL")},
        {" "}MKB-winstvrijstelling {(TAX_CONSTANTS.mkbVrijstellingRate * 100).toFixed(1)}%.
        {" "}Heffingskortingen (AHK + arbeidskorting), KIA en afschrijvingen zijn meegenomen.
        {" "}Afschrijvingen uitgaan van 5 jaar lineair, restwaarde €0.
      </div>
    </div>
  );
}

// ─── Subcomponenten ───

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
