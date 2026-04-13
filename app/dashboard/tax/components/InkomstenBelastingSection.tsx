"use client";

import type { DepreciationRow } from "@/lib/tax/dutch-tax-2026";
import { SkeletonCard, Th, Td } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { TAX_CONSTANTS } from "@/lib/tax/dutch-tax-2026";

interface TaxProjection {
  nettoIB: number;
  effectiefTarief: number;
  prognoseJaarOmzet: number;
  prognoseJaarKosten: number;
  prognoseJaarIB: number;
  brutoOmzet: number;
  kosten: number;
  afschrijvingen: number;
  brutoWinst: number;
  zelfstandigenaftrek: number;
  mkbVrijstelling: number;
  kia: number;
  totalInvestments: number;
  belastbaarInkomen: number;
  inkomstenbelasting: number;
  algemeneHeffingskorting: number;
  arbeidskorting: number;
  afschrijvingDetails: DepreciationRow[];
}

interface Props {
  projection: TaxProjection | null;
  isLoading: boolean;
}

export function InkomstenBelastingSection({ projection, isLoading }: Props) {
  const now = new Date();

  return (
    <>
      {isLoading ? (
        <SkeletonCard />
      ) : projection ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          borderTop: "1px solid var(--color-black)",
          borderBottom: "1px solid var(--color-black)",
          marginBottom: "var(--space-xl)",
        }}>
          {[
            {
              label: "Geschatte IB",
              value: formatCurrency(Math.round(projection.nettoIB)),
              sub: `Effectief tarief ${projection.effectiefTarief.toFixed(1)}%`,
            },
            {
              label: "Jaaromzet",
              value: formatCurrency(Math.round(projection.prognoseJaarOmzet)),
              sub: `Verwacht ${now.getFullYear()}`,
            },
            {
              label: "Jaarkosten",
              value: formatCurrency(Math.round(projection.prognoseJaarKosten)),
              sub: `Verwacht ${now.getFullYear()}`,
            },
            {
              label: "Jaar-IB",
              value: formatCurrency(Math.round(projection.prognoseJaarIB)),
              sub: "Prognose op jaarbasis",
            },
          ].map((item, i) => (
            <div
              key={item.label}
              style={{
                padding: i === 0 ? "24px 24px 24px 0" : i === 3 ? "24px 0 24px 24px" : "24px",
                borderLeft: i > 0 ? "0.5px solid rgba(0,0,0,0.08)" : "none",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <p className="label" style={{ margin: 0 }}>{item.label}</p>
              <p style={{ fontSize: "1.25rem", fontWeight: 600, letterSpacing: "-0.02em", margin: 0, lineHeight: 1 }}>
                {item.value}
              </p>
              <p style={{ fontSize: "var(--text-body-xs)", opacity: 0.35, margin: 0 }}>
                {item.sub}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Berekening */}
      {projection && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "160px 1fr",
          marginBottom: "var(--space-xl)",
        }}>
          <div style={{ paddingTop: 4 }}>
            <p className="label" style={{ margin: 0, position: "sticky", top: 80 }}>Berekening</p>
          </div>
          <div style={{ borderLeft: "0.5px solid rgba(0,0,0,0.1)", paddingLeft: 32 }}>
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

      {/* Investeringen & afschrijvingen */}
      {projection && projection.afschrijvingDetails.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "160px 1fr",
          marginBottom: "var(--space-xl)",
        }}>
          <div style={{ paddingTop: 4 }}>
            <p className="label" style={{ margin: 0 }}>Investeringen</p>
          </div>
          <div style={{ borderLeft: "0.5px solid rgba(0,0,0,0.1)", paddingLeft: 32 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-black)", textAlign: "left" }}>
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
                <tr style={{ borderTop: "1px solid var(--color-black)" }}>
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
        </div>
      )}
    </>
  );
}

// ─── Subcomponenten ───

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

function BreakdownSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <p className="label" style={{ margin: "0 0 12px", fontSize: 10 }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function BreakdownLine({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 0", fontSize: "var(--text-body-sm)" }}>
      <span style={{ fontWeight: 400, opacity: 0.55 }}>{label}</span>
      <span className="mono-amount" style={{ opacity: negative ? 0.4 : 0.85, marginLeft: 24 }}>
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
      padding: "12px 0 4px",
      borderTop: "1px solid var(--color-black)",
      marginTop: 6,
    }}>
      <span style={{ fontWeight: 600, fontSize: "var(--text-body-sm)" }}>{label}</span>
      <span
        className="mono-amount"
        style={{
          fontWeight: 700,
          fontSize: highlight ? "1.1rem" : "var(--text-body-md)",
          color: highlight ? "var(--color-accent)" : "inherit",
        }}
      >
        {formatCurrency(Math.round(value))}
      </span>
    </div>
  );
}
