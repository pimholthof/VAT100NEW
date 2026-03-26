"use client";

import { m as motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import type { JaarrekeningData } from "@/features/tax/jaarrekening";

interface ReportClientProps {
  data: JaarrekeningData | null;
  error: string | null;
  year: number;
}

export default function ReportClient({ data, error, year }: ReportClientProps) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const navigate = (newYear: number) => {
    if (newYear >= 2020 && newYear <= currentYear) {
      router.push(`/dashboard/report?jaar=${newYear}`);
    }
  };

  if (error && !data) {
    return (
      <div className="dashboard-content-inner">
        <p style={{ color: "var(--color-accent)" }}>{error}</p>
        <Link href="/dashboard" className="brutalist-action-link">
          &larr; Terug naar dashboard
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const { profiel, winstEnVerlies: wv, balans, btwKwartalen, btwJaarTotaal, fiscaal, investeringen } = data;

  return (
    <div className="dashboard-content-inner">
      {/* ── HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="brutalist-report-header"
      >
        <div className="brutalist-mark">VAT100</div>
        <div className="brutalist-meta">
          <span className="label">Jaarrekening</span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => navigate(year - 1)}
              className="brutalist-action-link"
              disabled={year <= 2020}
              style={{ opacity: year <= 2020 ? 0.2 : undefined }}
            >
              &larr;
            </button>
            <span className="brutalist-year">{year}</span>
            <button
              onClick={() => navigate(year + 1)}
              className="brutalist-action-link"
              disabled={year >= currentYear}
              style={{ opacity: year >= currentYear ? 0.2 : undefined }}
            >
              &rarr;
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── STUDIO INTRO ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="brutalist-intro"
      >
        <h1 className="brutalist-studio-name">{profiel.studioName}</h1>
        <p className="brutalist-period">
          Periode: januari &mdash; december {year}
        </p>
        {data.isVoorlopig && (
          <p style={{ color: "var(--color-accent)", fontSize: "var(--text-body-sm)", marginTop: 8, fontWeight: 600 }}>
            Voorlopig &mdash; boekjaar nog niet afgesloten
          </p>
        )}
      </motion.div>

      {/* ── KEY METRICS ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="brutalist-metrics-grid"
      >
        <MetricBlock label="Netto omzet" value={formatCurrency(wv.nettoOmzet)} large />
        <MetricBlock label="Bruto winst" value={formatCurrency(wv.brutoWinst)} />
        <MetricBlock label="Netto IB" value={formatCurrency(fiscaal.nettoIB)} sub={`${fiscaal.effectiefTarief}% effectief`} />
        <MetricBlock label="BTW afdracht" value={formatCurrency(btwJaarTotaal.nettoBtw)} />
      </motion.div>

      {/* ── 1. WINST- EN VERLIESREKENING ── */}
      <Section title="Winst- en verliesrekening" delay={0.2}>
        <table className="jr-table">
          <tbody>
            <Row label="Omzet excl. BTW" amount={wv.omzetExBtw} />
            {wv.creditnota > 0 && <Row label="Creditnota's" amount={-wv.creditnota} />}
            <RowBold label="Netto omzet" amount={wv.nettoOmzet} />

            {wv.kostenGroepen.map((g) => (
              <GroupRows key={g.groep} groep={g} />
            ))}
            <RowBold label="Totaal bedrijfskosten" amount={wv.totaalKosten} />

            {wv.afschrijvingen > 0 && <Row label="Afschrijvingen" amount={wv.afschrijvingen} />}
            <RowBold label="Bruto winst" amount={wv.brutoWinst} highlight />
          </tbody>
        </table>
      </Section>

      {/* ── 2. BALANS ── */}
      <Section title={`Balans per 31 december ${year}`} delay={0.25}>
        <div className="brutalist-grid-2">
          <div>
            <h3 className="label" style={{ marginBottom: 16 }}>Activa</h3>
            <table className="jr-table">
              <tbody>
                {balans.heeftBankData && <Row label="Bankrekening" amount={balans.bankSaldo} />}
                <Row label="Debiteuren" amount={balans.debiteuren} />
                {balans.vasteActiva > 0 && <Row label="Vaste activa (boekwaarde)" amount={balans.vasteActiva} />}
                <RowBold label="Totaal activa" amount={balans.totaalActiva} />
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="label" style={{ marginBottom: 16 }}>Passiva</h3>
            <table className="jr-table">
              <tbody>
                <Row label="BTW-schuld" amount={balans.btwSchuld} />
                <Row label="Belastingvoorziening" amount={balans.belastingVoorziening} />
                <Row label="Eigen vermogen" amount={balans.eigenVermogen} />
                <RowBold label="Totaal passiva" amount={balans.totaalPassiva} />
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ── 3. BTW JAAROVERZICHT ── */}
      <Section title="BTW Jaaroverzicht" delay={0.3}>
        <table className="jr-table">
          <thead>
            <tr className="jr-thead-row">
              <th className="jr-th" style={{ width: "16%" }}>Kwartaal</th>
              <th className="jr-th jr-right" style={{ width: "21%" }}>Omzet</th>
              <th className="jr-th jr-right" style={{ width: "21%" }}>Afdracht</th>
              <th className="jr-th jr-right" style={{ width: "21%" }}>Voorbelasting</th>
              <th className="jr-th jr-right" style={{ width: "21%" }}>Netto BTW</th>
            </tr>
          </thead>
          <tbody>
            {btwKwartalen.map((q) => (
              <tr key={q.quarter} className="jr-row">
                <td className="jr-td">{q.quarter}</td>
                <td className="jr-td jr-right">{formatCurrency(q.revenueExVat)}</td>
                <td className="jr-td jr-right">{formatCurrency(q.outputVat)}</td>
                <td className="jr-td jr-right">{formatCurrency(q.inputVat)}</td>
                <td className="jr-td jr-right">{formatCurrency(q.netVat)}</td>
              </tr>
            ))}
            <tr className="jr-row-bold">
              <td className="jr-td-bold">Totaal</td>
              <td className="jr-td-bold jr-right">{formatCurrency(btwJaarTotaal.omzetExBtw)}</td>
              <td className="jr-td-bold jr-right">{formatCurrency(btwJaarTotaal.outputBtw)}</td>
              <td className="jr-td-bold jr-right">{formatCurrency(btwJaarTotaal.inputBtw)}</td>
              <td className="jr-td-bold jr-right">{formatCurrency(btwJaarTotaal.nettoBtw)}</td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* ── 4. FISCALE SAMENVATTING ── */}
      <Section title="Fiscale samenvatting" delay={0.35}>
        <table className="jr-table">
          <tbody>
            <Row label="Bruto omzet" amount={fiscaal.brutoOmzet} />
            <Row label="Bedrijfskosten" amount={fiscaal.kosten} />
            <Row label="Afschrijvingen" amount={fiscaal.afschrijvingen} />
            <RowBold label="Bruto winst" amount={fiscaal.brutoWinst} />
            <Spacer />
            <Row label="Zelfstandigenaftrek" amount={-fiscaal.zelfstandigenaftrek} />
            <Row label="MKB-winstvrijstelling (12,7%)" amount={-fiscaal.mkbVrijstelling} />
            {fiscaal.kia > 0 && <Row label="Kleinschaligheidsinvesteringsaftrek" amount={-fiscaal.kia} />}
            <RowBold label="Belastbaar inkomen" amount={fiscaal.belastbaarInkomen} />
            <Spacer />
            <Row label="Inkomstenbelasting" amount={fiscaal.inkomstenbelasting} />
            <Row label="Algemene heffingskorting" amount={-fiscaal.algemeneHeffingskorting} />
            <Row label="Arbeidskorting" amount={-fiscaal.arbeidskorting} />
            <RowBold label="Netto inkomstenbelasting" amount={fiscaal.nettoIB} highlight />
            <Row label="Effectief belastingtarief" value={`${fiscaal.effectiefTarief}%`} />
          </tbody>
        </table>
      </Section>

      {/* ── 5. INVESTERINGEN & AFSCHRIJVINGEN ── */}
      {investeringen.length > 0 && (
        <Section title="Investeringen & afschrijvingen" delay={0.4}>
          <table className="jr-table">
            <thead>
              <tr className="jr-thead-row">
                <th className="jr-th">Omschrijving</th>
                <th className="jr-th jr-right">Aanschaf</th>
                <th className="jr-th">Datum</th>
                <th className="jr-th jr-right">Afschr/jaar</th>
                <th className="jr-th jr-right">Boekwaarde</th>
                <th className="jr-th jr-right">Rest</th>
              </tr>
            </thead>
            <tbody>
              {investeringen.map((inv) => (
                <tr key={inv.id} className="jr-row">
                  <td className="jr-td">{inv.omschrijving}</td>
                  <td className="jr-td jr-right">{formatCurrency(inv.aanschafprijs)}</td>
                  <td className="jr-td">{new Date(inv.aanschafDatum).toLocaleDateString("nl-NL")}</td>
                  <td className="jr-td jr-right">{formatCurrency(inv.jaarAfschrijving)}</td>
                  <td className="jr-td jr-right">{formatCurrency(inv.boekwaarde)}</td>
                  <td className="jr-td jr-right">{inv.resterendeJaren} jr</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* ── ACTIONS ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="brutalist-actions"
      >
        <Link href="/dashboard" className="brutalist-action-link">
          &larr; Terug naar dashboard
        </Link>
        <a
          href={`/api/jaarrekening/${year}`}
          target="_blank"
          rel="noopener noreferrer"
          className="brutalist-action-link"
        >
          Download PDF
        </a>
      </motion.div>

      {/* ── DISCLAIMER ── */}
      <p style={{
        fontSize: "var(--text-body-sm)",
        color: "rgba(0,0,0,0.3)",
        marginTop: 48,
        lineHeight: 1.5,
      }}>
        Dit overzicht is indicatief en geen vervanging voor professioneel boekhoudkundig advies.
        Raadpleeg een accountant voor je definitieve jaarrekening en belastingaangifte.
      </p>
    </div>
  );
}

// ─── Subcomponents ───

function Section({
  title,
  delay,
  children,
}: {
  title: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{ marginBottom: 48 }}
    >
      <h2 className="brutalist-section-title">
        {title}
        <span className="brutalist-rule" />
      </h2>
      {children}
    </motion.div>
  );
}

function MetricBlock({
  label,
  value,
  sub,
  large = false,
}: {
  label: string;
  value: string;
  sub?: string;
  large?: boolean;
}) {
  return (
    <div className={`brutalist-metric ${large ? "brutalist-metric-large" : ""}`}>
      <span className="brutalist-metric-label">{label}</span>
      <span className="brutalist-metric-value">{value}</span>
      {sub && <span className="brutalist-metric-sub">{sub}</span>}
    </div>
  );
}

function Row({
  label,
  amount,
  value,
}: {
  label: string;
  amount?: number;
  value?: string;
}) {
  return (
    <tr className="jr-row">
      <td className="jr-td">{label}</td>
      <td className="jr-td jr-right">
        {value ?? (amount !== undefined ? formatCurrency(amount) : "")}
      </td>
    </tr>
  );
}

function RowBold({
  label,
  amount,
  highlight = false,
}: {
  label: string;
  amount: number;
  highlight?: boolean;
}) {
  return (
    <tr className="jr-row-bold">
      <td className={`jr-td-bold ${highlight ? "jr-highlight" : ""}`}>{label}</td>
      <td className={`jr-td-bold jr-right ${highlight ? "jr-highlight" : ""}`}>
        {formatCurrency(amount)}
      </td>
    </tr>
  );
}

function GroupRows({ groep }: { groep: { groep: string; regels: { label: string; code: number; bedrag: number }[]; subtotaal: number } }) {
  return (
    <>
      {groep.regels.map((r) => (
        <Row key={`${groep.groep}-${r.code}`} label={r.label} amount={r.bedrag} />
      ))}
    </>
  );
}

function Spacer() {
  return (
    <tr>
      <td colSpan={2} style={{ height: 12 }} />
    </tr>
  );
}
