"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBtwOverview, getTaxProjection } from "@/features/tax/actions";
import { getDashboardData } from "@/features/dashboard/actions";
import { getTaxPaymentsSummary, getTaxPayments, createTaxPayment, deleteTaxPayment } from "@/features/tax/payments-actions";
import { getICPReport, type ICPEntry } from "@/features/tax/icp-actions";
import type { QuarterStats } from "@/features/tax/actions";
import type { DepreciationRow } from "@/lib/tax/dutch-tax-2026";
import type { TaxPaymentType } from "@/lib/types";
import type { VoorlopigeAanslagAdvies } from "@/lib/tax/voorlopige-aanslag";
import { SkeletonCard, SkeletonTable, Th, Td, ConfirmDialog } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { TAX_CONSTANTS } from "@/lib/tax/dutch-tax-2026";
import { AangifteExplainer } from "@/features/tax/components/AangifteExplainer";
import { FilingOverview } from "@/features/tax/components/FilingOverview";
import { DigipoortSubmitButton } from "@/features/tax/components/DigipoortSubmitButton";
import { FiscalDisclaimer } from "@/components/ui/FiscalDisclaimer";
import { InlineFeedback } from "@/components/feedback/InlineFeedback";
import { isBetaMode } from "@/lib/config/features";

export default function TaxContent() {
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
  // De detailberekening is rustig ingeklapt — je ziet het antwoord, niet de
  // worstenmakerij. Wie wil, klapt de volledige berekening uit.
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <div>
      {/* ══ HEADER ══ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "end",
        borderBottom: "1px solid var(--color-black)",
        paddingBottom: 20,
        marginBottom: "var(--space-xl)",
      }}>
        <div>
          <p className="label" style={{ margin: "0 0 8px" }}>Fiscaal overzicht {now.getFullYear()}</p>
          <h1 className="display-title">Belasting</h1>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <a href="/api/export/btw" download className="btn-ghost">Download lijst</a>
          <a href="/dashboard/tax/opening-balance" className="btn-secondary">Openingsbalans</a>
          {vatDeadline && (
            <a href="#btw-zone" className="btn-primary">
              BTW-aangifte {vatDeadline.quarter} — nog {vatDeadline.daysRemaining} dagen
            </a>
          )}
        </div>
      </div>

      {/* ══ AANGIFTES & AFSLUITING — readiness + één-tap volgende stap ══ */}
      <FilingOverview />

      {/* ══════════════════════════════════════════════════
          ZONE 1: INKOMSTENBELASTING
      ══════════════════════════════════════════════════ */}

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
              label: "IB — tot nu toe",
              value: formatCurrency(Math.round(projection.nettoIB)),
              sub: `Dit jaar · effectief ${projection.effectiefTarief.toFixed(1)}%`,
            },
            {
              label: "Jaaromzet — prognose",
              value: formatCurrency(Math.round(projection.prognoseJaarOmzet)),
              sub: `${formatCurrency(Math.round(projection.brutoOmzet))} t/m maand ${projection.maandenVerstreken}, doorgerekend naar 12`,
            },
            {
              label: "Jaarkosten — prognose",
              value: formatCurrency(Math.round(projection.prognoseJaarKosten)),
              sub: `Op basis van ${projection.maandenVerstreken} ${projection.maandenVerstreken === 1 ? "maand" : "maanden"}, doorgerekend naar 12`,
            },
            {
              label: "Jaar-IB — prognose",
              value: formatCurrency(Math.round(projection.prognoseJaarIB)),
              sub: `Op basis van ${projection.maandenVerstreken} ${projection.maandenVerstreken === 1 ? "maand" : "maanden"}, doorgerekend naar 12`,
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

      {/* Indicatie + toggle — altijd zichtbaar; de berekening zelf is rustig ingeklapt */}
      {projection && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: "var(--space-xl)",
        }}>
          <button
            type="button"
            onClick={() => setShowBreakdown((v) => !v)}
            aria-expanded={showBreakdown}
            className="btn-ghost"
          >
            {showBreakdown ? "Verberg berekening" : "Toon berekening"}
            <span style={{ display: "inline-block", transition: "transform var(--duration-quick) var(--ease-out-expo)", transform: showBreakdown ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
          </button>
          <p style={{ fontSize: "var(--text-body-xs)", opacity: 0.35, margin: 0 }}>
            Indicatie op basis van de tarieven {TAX_CONSTANTS.year}. Geen belastingadvies.
          </p>
        </div>
      )}

      {/* Berekening — label links, inhoud rechts (achter toggle) */}
      {projection && showBreakdown && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "160px 1fr",
          marginBottom: "var(--space-xl)",
        }}>
          <div style={{ paddingTop: 4 }}>
            <p className="label" style={{ margin: 0, position: "sticky", top: 80 }}>Berekening</p>
          </div>
          <div style={{ borderLeft: "0.5px solid rgba(0,0,0,0.1)", paddingLeft: 32 }}>
            <BreakdownSection title={`Winstberekening — dit jaar tot nu toe (${projection.maandenVerstreken} ${projection.maandenVerstreken === 1 ? "maand" : "maanden"})`}>
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
              <BreakdownTotal label="Geschatte inkomstenbelasting" value={projection.nettoIB} />
              <BreakdownLine
                label={`Bijdrage Zorgverzekeringswet (${(TAX_CONSTANTS.zvwRate * 100).toFixed(2)}%)`}
                value={projection.zvwBijdrage}
              />
              <BreakdownTotal label="Geschatte heffing (IB + Zvw)" value={projection.totaleHeffing} highlight />
            </BreakdownSection>

            <div style={{ marginTop: 20 }}>
              <FiscalDisclaimer>
                Indicatie van je inkomstenbelasting op basis van de tarieven {TAX_CONSTANTS.year},
                je facturen, bonnen en ingevulde gegevens. Geen belastingadvies — je
                definitieve aanslag kan afwijken. Twijfel je? Leg het voor aan een boekhouder.
              </FiscalDisclaimer>
            </div>
          </div>
        </div>
      )}

      {/* Investeringen & afschrijvingen — zelfde grid rhythm (bij de berekening) */}
      {projection && showBreakdown && projection.afschrijvingDetails.length > 0 && (
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
      {/* ── Editorial breaker ── */}
      <div style={{
        margin: "var(--space-xl) 0",
        height: 200,
        borderRadius: "var(--radius)",
        overflow: "hidden",
        position: "relative",
      }}>
        <Image
          src="/images/office-walnut.png"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          style={{
            objectFit: "cover",
            objectPosition: "center 40%",
            opacity: 0.12,
            filter: "grayscale(100%)",
          }}
        />
      </div>

      {/* ══════════════════════════════════════════════════
          ZONE 2: BTW (OMZETBELASTING)
      ══════════════════════════════════════════════════ */}

      <div id="btw-zone" style={{
        borderTop: "1px solid var(--color-black)",
        paddingTop: "var(--space-xl)",
        scrollMarginTop: 80,
      }}>
        {/* BTW header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "baseline",
          marginBottom: "var(--space-lg)",
        }}>
          <h2 className="section-header" style={{ margin: 0 }}>BTW (omzetbelasting)</h2>
          {vatDeadline && (
            <p className="label" style={{ margin: 0 }}>
              Volgende aangifte: {vatDeadline.quarter} — {vatDeadline.daysRemaining} dagen
            </p>
          )}
        </div>

        <AangifteExplainer />

        {/* BTW in same grid rhythm */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "160px 1fr",
          marginBottom: "var(--space-xl)",
        }}>
          <div style={{ paddingTop: 4 }}>
            <p className="label" style={{ margin: 0 }}>
              {btwLoading ? "" : current ? (current.netVat >= 0 ? "Te betalen" : "Te vorderen") : ""}
            </p>
          </div>
          <div style={{ borderLeft: "0.5px solid rgba(0,0,0,0.1)", paddingLeft: 32 }}>
            {btwLoading ? (
              <SkeletonCard />
            ) : current ? (
              <div style={{ marginBottom: 32 }}>
                <p style={{
                  fontSize: "clamp(2rem, 4vw, 3rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  margin: "0 0 8px",
                }}>
                  {formatCurrency(Math.abs(current.netVat))}
                </p>
                <p style={{ fontSize: "var(--text-body-sm)", opacity: 0.4, margin: 0 }}>
                  {current.quarter} · Dit kwartaal
                </p>
                {current.netVat > 0 && (
                  <BtwPayBlock quarterLabel={current.quarter} amount={current.netVat} />
                )}
              </div>
            ) : null}

            {/* Kwartaaloverzicht */}
            <p className="label" style={{ margin: "0 0 16px" }}>Kwartaaloverzicht</p>

            {btwLoading ? (
              <SkeletonTable columns="1fr 1fr 1fr 1fr 1fr 1fr" rows={4} headerWidths={[60, 80, 70, 70, 60, 50]} bodyWidths={[50, 70, 60, 60, 50, 40]} />
            ) : quarters.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "var(--space-lg)" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-black)", textAlign: "left" }}>
                    <Th>Kwartaal</Th>
                    <Th style={{ textAlign: "right" }}>Omzet</Th>
                    <Th style={{ textAlign: "right" }}>BTW ontvangen</Th>
                    <Th style={{ textAlign: "right" }}>BTW terugvraagbaar</Th>
                    <Th style={{ textAlign: "right" }}>Netto BTW</Th>
                    <Th>Status</Th>
                    <Th style={{ textAlign: "right" }}>Aangifte</Th>
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
                      <Td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", alignItems: "center" }}>
                          <a
                            href={`/api/export/btw-aangifte?year=${q.quarter.split(" ")[1]}&quarter=${q.quarter.split(" ")[0].replace("Q", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 12, opacity: 0.5, textDecoration: "none", color: "inherit" }}
                            title="BTW aangifte PDF"
                          >
                            Aangifte &darr;
                          </a>
                          <DigipoortSubmitButton quarter={q} />
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-state">Nog geen gegevens</p>
            )}

            {!btwLoading && quarters.length > 0 && (
              <div
                style={{
                  marginTop: "var(--space-lg)",
                  padding: "20px 24px",
                  border: "0.5px solid rgba(0, 0, 0, 0.08)",
                  borderRadius: "var(--radius)",
                  background: "rgba(45, 90, 123, 0.03)",
                }}
              >
                <p
                  className="label"
                  style={{
                    margin: "0 0 8px",
                    opacity: 0.55,
                    fontSize: 10,
                  }}
                >
                  Volgende stap · Dien in
                </p>
                <p
                  style={{
                    margin: "0 0 14px",
                    fontSize: 13,
                    opacity: 0.7,
                    lineHeight: 1.55,
                    maxWidth: 560,
                  }}
                >
                  Download de aangifte hierboven en neem de waarden over op
                  <strong> Mijn Belastingdienst Zakelijk</strong>. VAT100 dient
                  niet automatisch in — dat doe je zelf met DigiD of eHerkenning.
                </p>
                <a
                  href="https://mijn.belastingdienst.nl/mbd-pmb/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  Open Mijn Belastingdienst →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          ZONE 3: ICP-OPGAVE
      ══════════════════════════════════════════════════ */}

      <ICPSection year={now.getFullYear()} />

      {/* ══════════════════════════════════════════════════
          ZONE 4: VOORLOPIGE AANSLAGEN
      ══════════════════════════════════════════════════ */}

      <VoorlopigeAanslagSection year={now.getFullYear()} />

      {/* ── Editorial breaker ── */}
      <div style={{
        margin: "var(--space-xl) 0",
        height: 160,
        borderRadius: "var(--radius)",
        overflow: "hidden",
        position: "relative",
      }}>
        <Image
          src="/images/office-corridor.png"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          style={{
            objectFit: "cover",
            objectPosition: "center 60%",
            opacity: 0.09,
            filter: "grayscale(100%)",
          }}
        />
      </div>

      {isBetaMode() && (
        <div style={{ marginTop: "var(--space-section)", display: "flex", justifyContent: "center" }}>
          <InlineFeedback context="Belasting-cijfers" />
        </div>
      )}

      {/* ══ DISCLAIMER ══ */}
      <div style={{
        padding: "20px 0",
        marginTop: "var(--space-section)",
        borderTop: "0.5px solid rgba(0,0,0,0.06)",
        fontSize: 11,
        fontWeight: 400,
        lineHeight: 1.6,
        opacity: 0.4,
      }}>
        Dit is een schatting op basis van je facturen en bonnetjes.
        Deze cijfers zijn indicaties, geen belastingadvies.
        Doe je officiële BTW-aangifte via de Belastingdienst.
        Bewaar je administratie minimaal 7 jaar.
        Berekeningen op basis van belastingtarieven {TAX_CONSTANTS.year}.
      </div>
    </div>
  );
}

// ─── Subcomponenten ───

/**
 * BTW betalen — wrijvingsloos afdragen en vastleggen. De Belastingdienst
 * betaal je via je bank (met het betalingskenmerk van je aangifte); hier leg
 * je in één tik vast dat het betaald is, zodat je administratie klopt.
 */
function BtwPayBlock({ quarterLabel, amount }: { quarterLabel: string; amount: number }) {
  const queryClient = useQueryClient();
  const parts = quarterLabel.split(" ");
  const q = parts[0]?.replace("Q", "") ?? "";
  const year = parts[1] ?? "";
  const period = `${year}-Q${q}`;
  const today = new Date().toISOString().split("T")[0];

  const { data: paymentsRes } = useQuery({
    queryKey: ["tax-payments", year],
    queryFn: () => getTaxPayments(Number(year)),
    enabled: !!year,
  });
  const paid = paymentsRes?.data?.find((p) => p.type === "btw" && p.period === period) ?? null;

  const mutation = useMutation({
    mutationFn: () =>
      createTaxPayment({ type: "btw", period, amount, paid_date: today, reference: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-payments"] });
      queryClient.invalidateQueries({ queryKey: ["tax-payments-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
      {paid ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--color-success)" }}>
          ✓ Betaald op {paid.paid_date ? formatDate(paid.paid_date) : "—"}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          aria-busy={mutation.isPending || undefined}
          className="btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          {mutation.isPending ? "Opslaan…" : "Markeer als betaald"}
        </button>
      )}
      <a
        href="https://www.belastingdienst.nl/wps/wcm/connect/nl/btw/content/hoe-moet-ik-btw-betalen"
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: 12, opacity: 0.55, textDecoration: "none", color: "inherit" }}
      >
        Hoe betaal ik? →
      </a>
      {!paid && (
        <p style={{ margin: 0, fontSize: 11, opacity: 0.4, flexBasis: "100%", lineHeight: 1.5 }}>
          Betaal via je bank met het <strong>betalingskenmerk</strong> van je aangifte. Daarna leg je het hier in één tik vast.
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
          {new Date(row.aanschafDatum).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Amsterdam" })}
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

// ─── ICP Opgave Section ───

function ICPSection({ year }: { year: number }) {
  const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));

  const { data: icpResult, isLoading } = useQuery({
    queryKey: ["icp-report", year, quarter],
    queryFn: () => getICPReport(year, quarter),
  });

  const report = icpResult?.data;
  const entries = report?.entries ?? [];

  return (
    <div style={{
      borderTop: "0.5px solid rgba(13,13,11,0.08)",
      paddingTop: "var(--space-section)",
      marginTop: "var(--space-section)",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        flexWrap: "wrap",
        gap: 8,
        margin: "0 0 24px",
      }}>
        <h2 className="section-header" style={{ margin: 0 }}>ICP-opgave (EU-verkopen)</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={quarter}
            onChange={(e) => setQuarter(Number(e.target.value))}
            className="input"
            style={{ width: 100, fontSize: 12 }}
          >
            {[1, 2, 3, 4].map((q) => (
              <option key={q} value={q}>Q{q} {year}</option>
            ))}
          </select>
          {entries.length > 0 && (
            <a
              href={`/api/export/icp?year=${year}&quarter=${quarter}`}
              download
              className="btn-secondary"
              style={{ fontSize: 11 }}
            >
              Export CSV
            </a>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="skeleton" style={{ width: "100%", height: 100 }} />
      ) : entries.length === 0 ? (
        <p style={{ fontSize: 13, opacity: 0.4 }}>
          Geen intracommunautaire leveringen in Q{quarter} {year}.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
              <Th>Afnemer</Th>
              <Th>BTW-nummer</Th>
              <Th style={{ textAlign: "right" }}>Facturen</Th>
              <Th style={{ textAlign: "right" }}>Bedrag</Th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e: ICPEntry, i: number) => (
              <tr key={i} style={{ borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
                <Td>{e.clientName}</Td>
                <Td>
                  <span className="mono-amount" style={{ opacity: e.clientBtwNumber ? 1 : 0.3 }}>
                    {e.clientBtwNumber || "Ontbreekt"}
                  </span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span className="mono-amount">{e.invoiceCount}</span>
                </Td>
                <Td style={{ textAlign: "right" }}>
                  <span className="mono-amount">{formatCurrency(e.totalAmount)}</span>
                </Td>
              </tr>
            ))}
            <tr style={{ borderTop: "1px solid rgba(13,13,11,0.15)" }}>
              <Td><strong>Totaal</strong></Td>
              <Td />
              <Td />
              <Td style={{ textAlign: "right" }}>
                <span className="mono-amount" style={{ fontWeight: 600 }}>
                  {formatCurrency(report?.totalAmount ?? 0)}
                </span>
              </Td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Voorlopige Aanslag Section ───

function VoorlopigeAanslagHint({
  advies,
  year,
}: {
  advies: VoorlopigeAanslagAdvies;
  year: number;
}) {
  if (advies.status === "geen") return null;
  if (advies.status !== "gedekt" && !advies.materieel) return null;

  const gedekt = advies.status === "gedekt";
  const maanden =
    advies.resterendeMaanden === 1
      ? "1 maand"
      : `${advies.resterendeMaanden} maanden`;

  return (
    <div
      className="glass"
      style={{
        padding: "20px 24px",
        borderRadius: "var(--radius)",
        marginBottom: 32,
        borderLeft: `2px solid ${gedekt ? "var(--color-success)" : "var(--color-info)"}`,
      }}
    >
      <p
        className="label"
        style={{
          color: gedekt ? "var(--color-success)" : "var(--color-info)",
          margin: "0 0 6px",
        }}
      >
        Voorlopige aanslag
      </p>
      {gedekt ? (
        <p style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.6, margin: 0 }}>
          Je voorlopige aanslag dekt de verwachte heffing voor {year}. Geen
          actie nodig.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.6, margin: 0 }}>
            {advies.afgelopenJaar ? (
              <>
                Voor {year} rekent de Belastingdienst vanaf 1 juli {year + 1}{" "}
                belastingrente (6,5%) over wat nog openstaat:{" "}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrency(advies.openstaand)}
                </span>
                . Een aanvulling op de aanslag beperkt het bedrag waarover
                rente telt.
              </>
            ) : advies.status === "ongedekt" ? (
              <>
                Je verwachte heffing voor {year} is{" "}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrency(advies.verwachteHeffing)}
                </span>{" "}
                (inclusief Zvw), maar er staat nog geen voorlopige aanslag
                tegenover. Vraag er één aan via Mijn Belastingdienst en spreid
                het over {maanden}: zo&apos;n{" "}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrency(advies.maandbedrag)}
                </span>{" "}
                per maand.
              </>
            ) : (
              <>
                Je hebt{" "}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrency(advies.vaBetaald)}
                </span>{" "}
                aan voorlopige aanslag betaald van de verwachte{" "}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrency(advies.verwachteHeffing)}
                </span>{" "}
                (inclusief Zvw). Het restant komt neer op zo&apos;n{" "}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrency(advies.maandbedrag)}
                </span>{" "}
                per maand over de resterende {maanden}.
              </>
            )}
          </p>
          {!advies.afgelopenJaar && (
            <p
              style={{
                fontSize: 13,
                opacity: 0.5,
                lineHeight: 1.6,
                margin: "6px 0 0",
              }}
            >
              Blijft dit openstaan, dan rekent de Belastingdienst vanaf 1 juli{" "}
              {year + 1} 6,5% belastingrente — zo&apos;n{" "}
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatCurrency(advies.renteRisicoPerMaand)}
              </span>{" "}
              per maand.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function VoorlopigeAanslagSection({ year }: { year: number }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<TaxPaymentType>("ib");
  const [formPeriod, setFormPeriod] = useState(`${year}`);
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formRef, setFormRef] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: summaryResult, isLoading } = useQuery({
    queryKey: ["tax-payments-summary", year],
    queryFn: () => getTaxPaymentsSummary(year),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createTaxPayment({
        type: formType,
        period: formPeriod,
        amount: parseFloat(formAmount) || 0,
        paid_date: formDate || null,
        reference: formRef || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-payments-summary"] });
      setShowForm(false);
      setFormAmount("");
      setFormRef("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTaxPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-payments-summary"] });
    },
  });

  const summary = summaryResult?.data;

  return (
    <div style={{
      borderTop: "0.5px solid rgba(13,13,11,0.08)",
      paddingTop: "var(--space-section)",
      marginTop: "var(--space-section)",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        flexWrap: "wrap",
        gap: 8,
        margin: "0 0 24px",
      }}>
        <h2 className="section-header" style={{ margin: 0 }}>Voorlopige aanslagen</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-secondary"
        >
          {showForm ? "Annuleer" : "+ Betaling toevoegen"}
        </button>
      </div>

      {/* Samenvatting */}
      {!isLoading && summary && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          marginBottom: 32,
        }}>
          <div style={{ padding: "24px 24px 24px 0", borderRight: "0.5px solid rgba(0,0,0,0.08)" }}>
            <p className="label" style={{ margin: "0 0 10px" }}>Inkomstenbelasting</p>
            <p style={{ margin: "0 0 6px", fontSize: "var(--text-body-lg)", fontWeight: 600 }}>
              {formatCurrency(summary.ibBetaald)} <span style={{ opacity: 0.35, fontSize: "var(--text-body-sm)", fontWeight: 400 }}>betaald</span>
            </p>
            <p style={{ fontSize: "var(--text-body-xs)", opacity: 0.4, margin: 0 }}>
              Geschat: {formatCurrency(summary.geschatteIB)} — {summary.verschilIB > 0
                ? `nog ${formatCurrency(summary.verschilIB)} te betalen`
                : summary.verschilIB < 0
                  ? `${formatCurrency(Math.abs(summary.verschilIB))} teveel betaald`
                  : "op schema"}
            </p>
          </div>
          <div style={{ padding: "24px 0 24px 24px" }}>
            <p className="label" style={{ margin: "0 0 10px" }}>BTW</p>
            <p style={{ margin: "0 0 6px", fontSize: "var(--text-body-lg)", fontWeight: 600 }}>
              {formatCurrency(summary.btwBetaald)} <span style={{ opacity: 0.35, fontSize: "var(--text-body-sm)", fontWeight: 400 }}>betaald</span>
            </p>
            <p style={{ fontSize: "var(--text-body-xs)", opacity: 0.4, margin: 0 }}>
              Geschat: {formatCurrency(summary.geschatteBTW)} — {summary.verschilBTW > 0
                ? `nog ${formatCurrency(summary.verschilBTW)} te betalen`
                : summary.verschilBTW < 0
                  ? `${formatCurrency(Math.abs(summary.verschilBTW))} teveel betaald`
                  : "op schema"}
            </p>
          </div>
        </div>
      )}

      {!isLoading && summary && (
        <VoorlopigeAanslagHint advies={summary.vaAdvies} year={year} />
      )}

      {/* Formulier */}
      {showForm && (
        <div style={{
          padding: "24px 0",
          borderTop: "0.5px solid rgba(0,0,0,0.06)",
          borderBottom: "0.5px solid rgba(0,0,0,0.06)",
          marginBottom: 32,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 16, alignItems: "end" }}>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 8 }}>Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as TaxPaymentType)}
                className="input-field"
                style={{ height: 48, boxSizing: "border-box" }}
              >
                <option value="ib">Inkomstenbelasting</option>
                <option value="btw">BTW</option>
              </select>
            </div>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 8 }}>Periode</label>
              <input
                type="text"
                value={formPeriod}
                onChange={(e) => setFormPeriod(e.target.value)}
                placeholder={`${year} of ${year}-Q1`}
                className="input-field"
                style={{ height: 48, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 8 }}>Bedrag</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0,00"
                className="input-field"
                style={{ height: 48, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label className="label" style={{ display: "block", marginBottom: 8 }}>Betaaldatum</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="input-field"
                style={{ height: 48, boxSizing: "border-box" }}
              />
            </div>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !formAmount}
              aria-busy={createMutation.isPending || undefined}
              className="btn-primary"
              style={{
                height: 48,
                boxSizing: "border-box",
              }}
            >
              {createMutation.isPending ? "Opslaan..." : "Opslaan"}
            </button>
          </div>
        </div>
      )}

      {/* Betalingsoverzicht */}
      {isLoading ? (
        <SkeletonTable columns="1fr 1fr 1fr 1fr 80px" rows={3} headerWidths={[60, 50, 60, 50, 40]} bodyWidths={[50, 40, 50, 40, 30]} />
      ) : summary && summary.betalingen.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
              <Th>Type</Th>
              <Th>Periode</Th>
              <Th style={{ textAlign: "right" }}>Bedrag</Th>
              <Th>Betaaldatum</Th>
              <Th style={{ textAlign: "right" }}>Acties</Th>
            </tr>
          </thead>
          <tbody>
            {summary.betalingen.map((p) => (
              <tr key={p.id} style={{ borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
                <Td>
                  <span className="label" style={{ opacity: 1 }}>
                    {p.type === "ib" ? "Inkomstenbelasting" : "BTW"}
                  </span>
                </Td>
                <Td><span className="mono-amount">{p.period}</span></Td>
                <Td style={{ textAlign: "right" }}><span className="mono-amount">{formatCurrency(p.amount)}</span></Td>
                <Td><span className="mono-amount">{p.paid_date ? formatDate(p.paid_date) : "—"}</span></Td>
                <Td style={{ textAlign: "right" }}>
                  <button
                    onClick={() => setDeleteTarget(p.id)}
                    className="table-action"
                    style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.3 }}
                  >
                    Verwijder
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="empty-state">Nog geen voorlopige aanslagen geregistreerd</p>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Betaling verwijderen"
        message="Weet je zeker dat je deze betaling wilt verwijderen?"
        confirmLabel="Verwijderen"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
