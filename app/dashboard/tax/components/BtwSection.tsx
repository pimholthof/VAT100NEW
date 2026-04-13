"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getICPReport, type ICPEntry } from "@/features/tax/icp-actions";
import type { QuarterStats } from "@/features/tax/actions";
import { SkeletonCard, SkeletonTable, Th, Td } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

interface VatDeadline {
  quarter: string;
  daysRemaining: number;
}

interface Props {
  quarters: QuarterStats[];
  vatDeadline?: VatDeadline | null;
  isLoading: boolean;
  year: number;
}

export function BtwSection({ quarters, vatDeadline, isLoading, year }: Props) {
  const current = quarters.length > 0 ? quarters[0] : null;

  return (
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
            {isLoading ? "" : current ? (current.netVat >= 0 ? "Te betalen" : "Te vorderen") : ""}
          </p>
        </div>
        <div style={{ borderLeft: "0.5px solid rgba(0,0,0,0.1)", paddingLeft: 32 }}>
          {isLoading ? (
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

          {isLoading ? (
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

      {/* ICP-opgave */}
      <ICPSection year={year} />
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
