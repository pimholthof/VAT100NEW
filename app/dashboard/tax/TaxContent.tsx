"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBtwOverview, getTaxProjection } from "@/features/tax/actions";
import { getDashboardData } from "@/features/dashboard/actions";
import { getTaxPaymentsSummary, createTaxPayment, deleteTaxPayment } from "@/features/tax/payments-actions";
import { getVatReturns, generateVatReturn, lockVatReturn, submitVatReturn } from "@/features/tax/vat-returns-actions";
import type { QuarterStats } from "@/features/tax/actions";
import type { DepreciationRow } from "@/lib/tax/dutch-tax-2026";
import type { TaxPaymentType, VatReturn } from "@/lib/types";
import { SkeletonCard, SkeletonTable, Th, Td, ConfirmDialog } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { TAX_CONSTANTS } from "@/lib/tax/dutch-tax-2026";

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
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/api/export/btw" download className="btn-secondary">Download lijst</a>
          <a href="/dashboard/tax/opening-balance" className="btn-secondary">Openingsbalans</a>
        </div>
      </div>

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

      {/* Berekening — label links, inhoud rechts */}
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

      {/* Investeringen & afschrijvingen — zelfde grid rhythm */}
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
      {/* ── Editorial breaker ── */}
      <div style={{
        margin: "var(--space-xl) 0",
        height: 200,
        borderRadius: "var(--radius)",
        overflow: "hidden",
        position: "relative",
      }}>
        <img
          src="/images/office-walnut.png"
          alt=""
          style={{
            width: "100%",
            height: "100%",
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

      <div style={{
        borderTop: "1px solid var(--color-black)",
        paddingTop: "var(--space-xl)",
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
                        <a
                          href={`/api/export/btw-aangifte?year=${q.quarter.split(" ")[1]}&quarter=${q.quarter.split(" ")[0].replace("Q", "")}`}
                          download
                          style={{ fontSize: 12, opacity: 0.5, textDecoration: "none", color: "inherit" }}
                          title="Download BTW aangifte CSV"
                        >
                          Aangifte &darr;
                        </a>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-state">Nog geen gegevens</p>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          ZONE 3: VOORLOPIGE AANSLAGEN
      ══════════════════════════════════════════════════ */}

      <VoorlopigeAanslagSection year={now.getFullYear()} />

      {/* ── Editorial breaker ── */}
      <div style={{
        margin: "var(--space-xl) 0",
        height: 160,
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }}>
        <img
          src="/images/office-corridor.png"
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 60%",
            opacity: 0.09,
            filter: "grayscale(100%)",
          }}
        />
      </div>

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
        Doe je officiële BTW-aangifte via de Belastingdienst.
        Bewaar je administratie minimaal 7 jaar.
        Berekeningen op basis van belastingtarieven {TAX_CONSTANTS.year}.
      </div>
    </div>
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

// ─── BTW Aangifte Section (Fiscus-proof) ───

function BtwAangifteSection({ year }: { year: number }) {
  const queryClient = useQueryClient();
  const [preparingQ, setPreparingQ] = useState<number | null>(null);

  const { data: returnsResult, isLoading } = useQuery({
    queryKey: ["vat-returns"],
    queryFn: () => getVatReturns(),
  });

  const generateMutation = useMutation({
    mutationFn: (quarter: number) => generateVatReturn(year, quarter),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vat-returns"] });
      setPreparingQ(null);
    },
  });

  const lockMutation = useMutation({
    mutationFn: (id: string) => lockVatReturn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vat-returns"] });
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => submitVatReturn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vat-returns"] });
    },
  });

  const returns = (returnsResult?.data ?? []).filter((r) => r.year === year);

  const statusLabel = (status: string) => {
    switch (status) {
      case "draft": return "Concept";
      case "locked": return "Vergrendeld";
      case "submitted": return "Ingediend";
      default: return status;
    }
  };

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
        <h2 className="section-header" style={{ margin: 0 }}>BTW Aangiftes</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3, 4].map((q) => {
            const existing = returns.find((r) => r.quarter === q);
            if (existing && existing.status !== "draft") return null;
            return (
              <button
                key={q}
                onClick={() => { setPreparingQ(q); generateMutation.mutate(q); }}
                disabled={generateMutation.isPending}
                className="label-strong"
                style={{
                  padding: "12px 20px",
                  border: "1px solid var(--color-black)",
                  borderRadius: 9999,
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 10,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  opacity: generateMutation.isPending && preparingQ === q ? 0.5 : 1,
                }}
              >
                {generateMutation.isPending && preparingQ === q ? "Laden..." : existing ? `Q${q} herberekenen` : `Q${q} voorbereiden`}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable columns="1fr 1fr 1fr 1fr 1fr 1fr 1fr" rows={4} headerWidths={[50, 60, 60, 60, 60, 60, 60]} bodyWidths={[40, 50, 50, 50, 50, 50, 50]} />
      ) : returns.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)", textAlign: "left" }}>
              <Th>Kwartaal</Th>
              <Th style={{ textAlign: "right" }}>1a BTW (21%)</Th>
              <Th style={{ textAlign: "right" }}>1b BTW (9%)</Th>
              <Th style={{ textAlign: "right" }}>5b Voorbelasting</Th>
              <Th style={{ textAlign: "right" }}>Saldo</Th>
              <Th>Status</Th>
              <Th style={{ textAlign: "right" }}>Actie</Th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r: VatReturn) => {
              const totalBtw = r.rubriek_1a_btw + r.rubriek_1b_btw + r.rubriek_1c_btw;
              const saldo = totalBtw - r.rubriek_5b;
              return (
                <tr key={r.id} style={{ borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
                  <Td><span className="mono-amount">Q{r.quarter} {r.year}</span></Td>
                  <Td style={{ textAlign: "right" }}><span className="mono-amount">{formatCurrency(r.rubriek_1a_btw)}</span></Td>
                  <Td style={{ textAlign: "right" }}><span className="mono-amount">{formatCurrency(r.rubriek_1b_btw)}</span></Td>
                  <Td style={{ textAlign: "right" }}><span className="mono-amount">{formatCurrency(r.rubriek_5b)}</span></Td>
                  <Td style={{ textAlign: "right" }}>
                    <span className="mono-amount" style={{ fontWeight: 600 }}>
                      {formatCurrency(saldo)}
                    </span>
                  </Td>
                  <Td>
                    <span className="label" style={{
                      opacity: 1,
                      color: r.status === "submitted" ? "green" : r.status === "locked" ? "var(--foreground)" : "inherit",
                    }}>
                      {statusLabel(r.status)}
                    </span>
                    {r.submitted_at && (
                      <span style={{ display: "block", fontSize: "var(--text-body-xs)", opacity: 0.4 }}>
                        {formatDate(r.submitted_at)}
                      </span>
                    )}
                  </Td>
                  <Td style={{ textAlign: "right" }}>
                    {r.status === "draft" && (
                      <button
                        onClick={() => lockMutation.mutate(r.id)}
                        disabled={lockMutation.isPending}
                        className="label-strong"
                        style={{
                          padding: "10px 20px",
                          border: "1px solid var(--color-black)",
                          borderRadius: 9999,
                          background: "var(--foreground)",
                          color: "var(--background)",
                          cursor: "pointer",
                          fontSize: 10,
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                        }}
                      >
                        Vergrendelen
                      </button>
                    )}
                    {r.status === "locked" && (
                      <button
                        onClick={() => submitMutation.mutate(r.id)}
                        disabled={submitMutation.isPending}
                        className="table-action"
                        style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5, fontSize: 11 }}
                      >
                        Markeer ingediend
                      </button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="empty-state" style={{ marginBottom: 24 }}>
          Nog geen BTW aangiftes. Bereid een kwartaal voor om te beginnen.
        </p>
      )}
    </div>
  );
}

// ─── Voorlopige Aanslag Section ───

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
          className="label-strong"
          style={{
            padding: "12px 24px",
            border: "1px solid var(--color-black)",
            borderRadius: 9999,
            background: "transparent",
            cursor: "pointer",
            fontSize: 10,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
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
              className="btn-primary"
              style={{
                height: 48,
                boxSizing: "border-box",
                opacity: createMutation.isPending || !formAmount ? 0.4 : 1,
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
