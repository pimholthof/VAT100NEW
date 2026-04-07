import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { JaarrekeningData } from "../jaarrekening";
import { formatCurrency, formatDate } from "@/lib/format";

// ─── Design tokens (identical to InvoicePDF) ───

const COLOR = "#0A0A0A";
const ACCENT = "#A51C30";
const MARGIN = 56;

const LABEL = {
  fontSize: 9,
  letterSpacing: 0.15 * 9,
  color: "rgba(10,10,10,0.4)",
  fontFamily: "Helvetica",
  fontWeight: 700 as const,
  textTransform: "uppercase" as const,
};

const VALUE = {
  fontSize: 10,
  fontFamily: "Helvetica",
  fontWeight: 400 as const,
  color: COLOR,
};

const HERO = {
  fontFamily: "Courier",
  fontWeight: 900 as const,
  fontSize: 140,
  letterSpacing: -0.03 * 140,
  color: COLOR,
};

const RULE = {
  borderBottomWidth: 1,
  borderBottomColor: COLOR,
  borderBottomStyle: "solid" as const,
};

const RULE_THIN = {
  borderBottomWidth: 0.5,
  borderBottomColor: "rgba(10,10,10,0.2)",
  borderBottomStyle: "solid" as const,
};

// ─── Helpers ───

const fc = formatCurrency;

// ─── Styles ───

const s = StyleSheet.create({
  page: {
    width: 595,
    height: 842,
    paddingTop: MARGIN,
    paddingBottom: MARGIN + 24,
    paddingLeft: MARGIN,
    paddingRight: MARGIN,
    fontFamily: "Helvetica",
    fontWeight: 400,
    color: COLOR,
    backgroundColor: "#FFFFFF",
  },

  // Header
  header: {
    marginBottom: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    ...RULE,
    paddingBottom: 16,
  },
  vat100Mark: {
    ...HERO,
    lineHeight: 0.85,
  },
  docType: {
    fontSize: 11,
    fontFamily: "Helvetica",
    fontWeight: 700,
    letterSpacing: 0.2 * 11,
    color: ACCENT,
    textTransform: "uppercase" as const,
  },

  // Meta
  metaGrid: {
    flexDirection: "row",
    marginBottom: 48,
    gap: 48,
  },
  metaLeft: { width: "55%" },
  metaRight: { flex: 1 },
  metaBlock: { marginBottom: 24 },
  metaLabel: { ...LABEL, marginBottom: 6 },
  metaValue: { ...VALUE, lineHeight: 1.4 },
  metaValueLarge: {
    fontSize: 22,
    fontFamily: "Helvetica",
    fontWeight: 700,
    letterSpacing: -0.02 * 22,
    color: COLOR,
  },

  // Section headers
  sectionTitle: {
    ...LABEL,
    fontSize: 10,
    letterSpacing: 0.2 * 10,
    marginBottom: 16,
    marginTop: 32,
    color: ACCENT,
  },
  sectionTitleFirst: {
    ...LABEL,
    fontSize: 10,
    letterSpacing: 0.2 * 10,
    marginBottom: 16,
    color: ACCENT,
  },

  // Table
  tableHeader: {
    flexDirection: "row",
    ...RULE,
    paddingVertical: 8,
  },
  tableHeaderCell: { ...LABEL, fontSize: 7 },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    ...RULE_THIN,
  },
  tableRowBold: {
    flexDirection: "row",
    paddingVertical: 8,
    ...RULE,
  },
  tableCell: { ...VALUE, fontSize: 9 },
  tableCellBold: { ...VALUE, fontSize: 9, fontWeight: 700 },

  // P&L specific columns
  plLabel: { width: "55%" },
  plAmount: { width: "25%", textAlign: "right" as const },
  plTotal: { width: "20%", textAlign: "right" as const },

  // Balance columns
  balCol: { width: "50%", paddingRight: 16 },
  balLabel: { width: "60%" },
  balAmount: { width: "40%", textAlign: "right" as const },

  // BTW columns
  btwQ: { width: "16%" },
  btwOmzet: { width: "21%", textAlign: "right" as const },
  btwOutput: { width: "21%", textAlign: "right" as const },
  btwInput: { width: "21%", textAlign: "right" as const },
  btwNet: { width: "21%", textAlign: "right" as const },

  // Fiscal breakdown
  fiscRow: {
    flexDirection: "row",
    paddingVertical: 5,
    ...RULE_THIN,
  },
  fiscLabel: { width: "60%", ...VALUE, fontSize: 9 },
  fiscValue: { width: "40%", textAlign: "right" as const, ...VALUE, fontSize: 9 },
  fiscRowBold: {
    flexDirection: "row",
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: COLOR,
    marginTop: 4,
  },
  fiscLabelBold: { width: "60%", ...VALUE, fontSize: 10, fontWeight: 700 },
  fiscValueBold: {
    width: "40%",
    textAlign: "right" as const,
    ...VALUE,
    fontSize: 12,
    fontWeight: 700,
  },

  // Investment columns
  invDesc: { width: "25%" },
  invPrijs: { width: "15%", textAlign: "right" as const },
  invDatum: { width: "15%" },
  invAfschr: { width: "15%", textAlign: "right" as const },
  invBoek: { width: "15%", textAlign: "right" as const },
  invRest: { width: "15%", textAlign: "right" as const },

  // Voorlopig banner
  banner: {
    backgroundColor: "rgba(165,28,48,0.06)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  bannerText: {
    fontSize: 8,
    fontFamily: "Helvetica",
    fontWeight: 700,
    color: ACCENT,
    textTransform: "uppercase" as const,
    letterSpacing: 0.15 * 8,
  },

  // Footer
  footer: {
    position: "absolute" as const,
    bottom: MARGIN,
    left: MARGIN,
    right: MARGIN,
    flexDirection: "row",
    justifyContent: "space-between",
    ...RULE_THIN,
    paddingTop: 12,
  },
  footerText: {
    fontSize: 7,
    fontFamily: "Helvetica",
    fontWeight: 400,
    color: "rgba(10,10,10,0.35)",
  },
});

// ─── Component ───

function FooterBlock({ pageNum, totalPages, studioName, kvkNumber, genDate }: {
  pageNum: number; totalPages: number; studioName: string; kvkNumber?: string | null; genDate: string;
}) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{studioName}{kvkNumber ? ` — KVK ${kvkNumber}` : ""}</Text>
      <Text style={s.footerText}>Gegenereerd {genDate}</Text>
      <Text style={s.footerText}>Pagina {pageNum}/{totalPages}</Text>
    </View>
  );
}

export function JaarrekeningPDF({ data }: { data: JaarrekeningData }) {
  const { profiel, winstEnVerlies: wv, balans, btwKwartalen, btwJaarTotaal, fiscaal, investeringen } = data;
  const genDate = new Date().toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const totalPages = investeringen.length > 0 ? 3 : 2;
  const footerProps = { studioName: profiel.studioName, kvkNumber: profiel.kvkNumber, genDate, totalPages };

  return (
    <Document>
      {/* ═══ PAGE 1: Cover + Winst- en verliesrekening ═══ */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.vat100Mark}>VAT100</Text>
          <Text style={s.docType}>Jaarrekening</Text>
        </View>

        {data.isVoorlopig && (
          <View style={s.banner}>
            <Text style={s.bannerText}>Voorlopig — boekjaar nog niet afgesloten</Text>
          </View>
        )}

        <View style={s.metaGrid}>
          <View style={s.metaLeft}>
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Onderneming</Text>
              <Text style={s.metaValueLarge}>{profiel.studioName}</Text>
              {profiel.kvkNumber && <Text style={s.metaValue}>KVK {profiel.kvkNumber}</Text>}
              {profiel.btwNumber && <Text style={s.metaValue}>BTW {profiel.btwNumber}</Text>}
              {profiel.address && <Text style={s.metaValue}>{profiel.address}</Text>}
              {(profiel.postalCode || profiel.city) && (
                <Text style={s.metaValue}>
                  {[profiel.postalCode, profiel.city].filter(Boolean).join(" ")}
                </Text>
              )}
            </View>
          </View>
          <View style={s.metaRight}>
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Boekjaar</Text>
              <Text style={s.metaValueLarge}>{data.jaar}</Text>
            </View>
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Periode</Text>
              <Text style={s.metaValue}>1 januari — 31 december {data.jaar}</Text>
            </View>
          </View>
        </View>

        {/* ── Winst- en verliesrekening ── */}
        <Text style={s.sectionTitleFirst}>Winst- en verliesrekening</Text>

        {/* Omzet */}
        <View style={s.tableRow}>
          <Text style={[s.tableCell, s.plLabel]}>Omzet excl. BTW</Text>
          <Text style={[s.tableCell, s.plAmount]}>{fc(wv.omzetExBtw)}</Text>
          <Text style={[s.tableCell, s.plTotal]} />
        </View>
        {wv.creditnota > 0 && (
          <View style={s.tableRow}>
            <Text style={[s.tableCell, s.plLabel]}>Creditnota&apos;s</Text>
            <Text style={[s.tableCell, s.plAmount]}>-{fc(wv.creditnota)}</Text>
            <Text style={[s.tableCell, s.plTotal]} />
          </View>
        )}
        <View style={s.tableRowBold}>
          <Text style={[s.tableCellBold, s.plLabel]}>Netto omzet</Text>
          <Text style={[s.tableCellBold, s.plAmount]} />
          <Text style={[s.tableCellBold, s.plTotal]}>{fc(wv.nettoOmzet)}</Text>
        </View>

        {/* Kosten per groep */}
        {wv.kostenGroepen.map((groep) => (
          <View key={groep.groep}>
            {groep.regels.map((r) => (
              <View style={s.tableRow} key={`${groep.groep}-${r.code}`}>
                <Text style={[s.tableCell, s.plLabel]}>{r.label}</Text>
                <Text style={[s.tableCell, s.plAmount]}>{fc(r.bedrag)}</Text>
                <Text style={[s.tableCell, s.plTotal]} />
              </View>
            ))}
          </View>
        ))}
        <View style={s.tableRowBold}>
          <Text style={[s.tableCellBold, s.plLabel]}>Totaal bedrijfskosten</Text>
          <Text style={[s.tableCellBold, s.plAmount]} />
          <Text style={[s.tableCellBold, s.plTotal]}>{fc(wv.totaalKosten)}</Text>
        </View>

        {wv.afschrijvingen > 0 && (
          <View style={s.tableRow}>
            <Text style={[s.tableCell, s.plLabel]}>Afschrijvingen</Text>
            <Text style={[s.tableCell, s.plAmount]} />
            <Text style={[s.tableCell, s.plTotal]}>{fc(wv.afschrijvingen)}</Text>
          </View>
        )}

        {/* Bruto winst */}
        <View style={[s.tableRowBold, { marginTop: 8 }]}>
          <Text style={[s.tableCellBold, s.plLabel, { fontSize: 12 }]}>Bruto winst</Text>
          <Text style={[s.tableCellBold, s.plAmount]} />
          <Text style={[s.tableCellBold, s.plTotal, { fontSize: 12 }]}>{fc(wv.brutoWinst)}</Text>
        </View>

        <FooterBlock pageNum={1} {...footerProps} />
      </Page>

      {/* ═══ PAGE 2: Balans + BTW Jaaroverzicht ═══ */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitleFirst}>Balans per 31 december {data.jaar}</Text>

        <View style={{ flexDirection: "row", marginBottom: 32 }}>
          {/* Activa */}
          <View style={s.balCol}>
            <View style={[s.tableHeader, { marginBottom: 0 }]}>
              <Text style={[s.tableHeaderCell, { width: "100%" }]}>Activa</Text>
            </View>
            {balans.heeftBankData && (
              <View style={s.tableRow}>
                <Text style={[s.tableCell, s.balLabel]}>Bankrekening</Text>
                <Text style={[s.tableCell, s.balAmount]}>{fc(balans.bankSaldo)}</Text>
              </View>
            )}
            <View style={s.tableRow}>
              <Text style={[s.tableCell, s.balLabel]}>Debiteuren</Text>
              <Text style={[s.tableCell, s.balAmount]}>{fc(balans.debiteuren)}</Text>
            </View>
            {balans.vasteActiva > 0 && (
              <View style={s.tableRow}>
                <Text style={[s.tableCell, s.balLabel]}>Vaste activa (boekwaarde)</Text>
                <Text style={[s.tableCell, s.balAmount]}>{fc(balans.vasteActiva)}</Text>
              </View>
            )}
            <View style={s.tableRowBold}>
              <Text style={[s.tableCellBold, s.balLabel]}>Totaal activa</Text>
              <Text style={[s.tableCellBold, s.balAmount]}>{fc(balans.totaalActiva)}</Text>
            </View>
          </View>

          {/* Passiva */}
          <View style={s.balCol}>
            <View style={[s.tableHeader, { marginBottom: 0 }]}>
              <Text style={[s.tableHeaderCell, { width: "100%" }]}>Passiva</Text>
            </View>
            <View style={s.tableRow}>
              <Text style={[s.tableCell, s.balLabel]}>BTW-schuld</Text>
              <Text style={[s.tableCell, s.balAmount]}>{fc(balans.btwSchuld)}</Text>
            </View>
            <View style={s.tableRow}>
              <Text style={[s.tableCell, s.balLabel]}>Belastingvoorziening</Text>
              <Text style={[s.tableCell, s.balAmount]}>{fc(balans.belastingVoorziening)}</Text>
            </View>
            <View style={s.tableRow}>
              <Text style={[s.tableCell, s.balLabel]}>Eigen vermogen</Text>
              <Text style={[s.tableCell, s.balAmount]}>{fc(balans.eigenVermogen)}</Text>
            </View>
            <View style={s.tableRowBold}>
              <Text style={[s.tableCellBold, s.balLabel]}>Totaal passiva</Text>
              <Text style={[s.tableCellBold, s.balAmount]}>{fc(balans.totaalPassiva)}</Text>
            </View>
          </View>
        </View>

        {/* ── BTW Jaaroverzicht ── */}
        <Text style={s.sectionTitle}>BTW Jaaroverzicht</Text>

        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderCell, s.btwQ]}>Kwartaal</Text>
          <Text style={[s.tableHeaderCell, s.btwOmzet]}>Omzet</Text>
          <Text style={[s.tableHeaderCell, s.btwOutput]}>Afdracht</Text>
          <Text style={[s.tableHeaderCell, s.btwInput]}>Voorbelasting</Text>
          <Text style={[s.tableHeaderCell, s.btwNet]}>Netto BTW</Text>
        </View>
        {btwKwartalen.map((q) => (
          <View style={s.tableRow} key={q.quarter}>
            <Text style={[s.tableCell, s.btwQ]}>{q.quarter}</Text>
            <Text style={[s.tableCell, s.btwOmzet]}>{fc(q.revenueExVat)}</Text>
            <Text style={[s.tableCell, s.btwOutput]}>{fc(q.outputVat)}</Text>
            <Text style={[s.tableCell, s.btwInput]}>{fc(q.inputVat)}</Text>
            <Text style={[s.tableCell, s.btwNet]}>{fc(q.netVat)}</Text>
          </View>
        ))}
        <View style={s.tableRowBold}>
          <Text style={[s.tableCellBold, s.btwQ]}>Totaal</Text>
          <Text style={[s.tableCellBold, s.btwOmzet]}>{fc(btwJaarTotaal.omzetExBtw)}</Text>
          <Text style={[s.tableCellBold, s.btwOutput]}>{fc(btwJaarTotaal.outputBtw)}</Text>
          <Text style={[s.tableCellBold, s.btwInput]}>{fc(btwJaarTotaal.inputBtw)}</Text>
          <Text style={[s.tableCellBold, s.btwNet]}>{fc(btwJaarTotaal.nettoBtw)}</Text>
        </View>

        {/* ── Fiscale samenvatting ── */}
        <Text style={s.sectionTitle}>Fiscale samenvatting</Text>

        <View style={s.fiscRow}>
          <Text style={s.fiscLabel}>Bruto omzet</Text>
          <Text style={s.fiscValue}>{fc(fiscaal.brutoOmzet)}</Text>
        </View>
        <View style={s.fiscRow}>
          <Text style={s.fiscLabel}>Bedrijfskosten</Text>
          <Text style={s.fiscValue}>{fc(fiscaal.kosten)}</Text>
        </View>
        <View style={s.fiscRow}>
          <Text style={s.fiscLabel}>Afschrijvingen</Text>
          <Text style={s.fiscValue}>{fc(fiscaal.afschrijvingen)}</Text>
        </View>
        <View style={s.fiscRow}>
          <Text style={s.fiscLabel}>Bruto winst</Text>
          <Text style={[s.fiscValue, { fontWeight: 700 }]}>{fc(fiscaal.brutoWinst)}</Text>
        </View>
        <View style={[s.fiscRow, { marginTop: 8 }]}>
          <Text style={s.fiscLabel}>Zelfstandigenaftrek</Text>
          <Text style={s.fiscValue}>-{fc(fiscaal.zelfstandigenaftrek)}</Text>
        </View>
        <View style={s.fiscRow}>
          <Text style={s.fiscLabel}>MKB-winstvrijstelling (12,7%)</Text>
          <Text style={s.fiscValue}>-{fc(fiscaal.mkbVrijstelling)}</Text>
        </View>
        {fiscaal.kia > 0 && (
          <View style={s.fiscRow}>
            <Text style={s.fiscLabel}>Kleinschaligheidsinvesteringsaftrek</Text>
            <Text style={s.fiscValue}>-{fc(fiscaal.kia)}</Text>
          </View>
        )}
        <View style={s.fiscRow}>
          <Text style={s.fiscLabel}>Belastbaar inkomen</Text>
          <Text style={[s.fiscValue, { fontWeight: 700 }]}>{fc(fiscaal.belastbaarInkomen)}</Text>
        </View>
        <View style={[s.fiscRow, { marginTop: 8 }]}>
          <Text style={s.fiscLabel}>Inkomstenbelasting</Text>
          <Text style={s.fiscValue}>{fc(fiscaal.inkomstenbelasting)}</Text>
        </View>
        <View style={s.fiscRow}>
          <Text style={s.fiscLabel}>Algemene heffingskorting</Text>
          <Text style={s.fiscValue}>-{fc(fiscaal.algemeneHeffingskorting)}</Text>
        </View>
        <View style={s.fiscRow}>
          <Text style={s.fiscLabel}>Arbeidskorting</Text>
          <Text style={s.fiscValue}>-{fc(fiscaal.arbeidskorting)}</Text>
        </View>
        <View style={s.fiscRowBold}>
          <Text style={s.fiscLabelBold}>Netto inkomstenbelasting</Text>
          <Text style={s.fiscValueBold}>{fc(fiscaal.nettoIB)}</Text>
        </View>
        <View style={[s.fiscRow, { marginTop: 4 }]}>
          <Text style={s.fiscLabel}>Effectief belastingtarief</Text>
          <Text style={s.fiscValue}>{fiscaal.effectiefTarief}%</Text>
        </View>

        <FooterBlock pageNum={2} {...footerProps} />
      </Page>

      {/* ═══ PAGE 3: Investeringen & Afschrijvingen (conditional) ═══ */}
      {investeringen.length > 0 && (
        <Page size="A4" style={s.page}>
          <Text style={s.sectionTitleFirst}>Investeringen &amp; afschrijvingen</Text>

          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, s.invDesc]}>Omschrijving</Text>
            <Text style={[s.tableHeaderCell, s.invPrijs]}>Aanschaf</Text>
            <Text style={[s.tableHeaderCell, s.invDatum]}>Datum</Text>
            <Text style={[s.tableHeaderCell, s.invAfschr]}>Afschr/jaar</Text>
            <Text style={[s.tableHeaderCell, s.invBoek]}>Boekwaarde</Text>
            <Text style={[s.tableHeaderCell, s.invRest]}>Resterend</Text>
          </View>

          {investeringen.map((inv) => (
            <View style={s.tableRow} key={inv.id}>
              <Text style={[s.tableCell, s.invDesc]}>{inv.omschrijving}</Text>
              <Text style={[s.tableCell, s.invPrijs]}>{fc(inv.aanschafprijs)}</Text>
              <Text style={[s.tableCell, s.invDatum]}>{formatDate(inv.aanschafDatum)}</Text>
              <Text style={[s.tableCell, s.invAfschr]}>{fc(inv.jaarAfschrijving)}</Text>
              <Text style={[s.tableCell, s.invBoek]}>{fc(inv.boekwaarde)}</Text>
              <Text style={[s.tableCell, s.invRest]}>{inv.resterendeJaren} jr</Text>
            </View>
          ))}

          <View style={s.tableRowBold}>
            <Text style={[s.tableCellBold, s.invDesc]}>Totaal</Text>
            <Text style={[s.tableCellBold, s.invPrijs]}>
              {fc(investeringen.reduce((s, i) => s + i.aanschafprijs, 0))}
            </Text>
            <Text style={[s.tableCellBold, s.invDatum]} />
            <Text style={[s.tableCellBold, s.invAfschr]}>
              {fc(investeringen.reduce((s, i) => s + i.jaarAfschrijving, 0))}
            </Text>
            <Text style={[s.tableCellBold, s.invBoek]}>
              {fc(investeringen.reduce((s, i) => s + i.boekwaarde, 0))}
            </Text>
            <Text style={[s.tableCellBold, s.invRest]} />
          </View>

          <FooterBlock pageNum={3} {...footerProps} />
        </Page>
      )}
    </Document>
  );
}
