import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { BtwAangifteData } from "../btw-aangifte";
import { formatCurrency } from "@/lib/format";

// ─── Design tokens (shared with JaarrekeningPDF) ───

const COLOR = "#0A0A0A";
const ACCENT = "#A51C30";
const GREY = "rgba(10,10,10,0.4)";
const MARGIN = 56;

const LABEL = {
  fontSize: 9,
  letterSpacing: 0.15 * 9,
  color: GREY,
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
    backgroundColor: "#FAFAF8",
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
    fontFamily: "Courier",
    fontWeight: 900,
    fontSize: 120,
    letterSpacing: -0.03 * 120,
    color: COLOR,
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
    marginBottom: 40,
    gap: 48,
  },
  metaLeft: { width: "55%" },
  metaRight: { flex: 1 },
  metaBlock: { marginBottom: 20 },
  metaLabel: { ...LABEL, marginBottom: 6 },
  metaValue: { ...VALUE, lineHeight: 1.4 },
  metaValueLarge: {
    fontSize: 24,
    fontFamily: "Helvetica",
    fontWeight: 700,
    letterSpacing: -0.02 * 24,
    color: COLOR,
  },

  // Section headers
  sectionTitleFirst: {
    ...LABEL,
    fontSize: 10,
    letterSpacing: 0.2 * 10,
    marginBottom: 12,
    color: ACCENT,
  },
  sectionTitle: {
    ...LABEL,
    fontSize: 10,
    letterSpacing: 0.2 * 10,
    marginBottom: 12,
    marginTop: 20,
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
    paddingVertical: 7,
    ...RULE_THIN,
  },

  // Column widths
  colRubriek: { width: "10%" },
  colOmschrijving: { width: "50%" },
  colOmzet: { width: "20%", textAlign: "right" as const },
  colBtw: { width: "20%", textAlign: "right" as const },

  tableCell: { ...VALUE, fontSize: 9 },
  tableCellMono: {
    ...VALUE,
    fontSize: 9,
    fontFamily: "Courier",
    fontWeight: 700,
    letterSpacing: -0.01 * 9,
  },

  // Summary block
  summaryWrap: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: COLOR,
    borderTopStyle: "solid" as const,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    ...RULE_THIN,
  },
  summaryLabel: { ...VALUE, fontSize: 9 },
  summaryValue: { ...VALUE, fontSize: 9, textAlign: "right" as const },
  summaryFinalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginTop: 6,
    borderTopWidth: 2,
    borderTopColor: ACCENT,
    borderTopStyle: "solid" as const,
  },
  summaryFinalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica",
    fontWeight: 700,
    color: COLOR,
    textTransform: "uppercase" as const,
    letterSpacing: 0.1 * 10,
  },
  summaryFinalValue: {
    fontSize: 16,
    fontFamily: "Helvetica",
    fontWeight: 700,
    color: COLOR,
    textAlign: "right" as const,
  },
  summaryFinalSub: {
    fontSize: 8,
    fontFamily: "Helvetica",
    fontWeight: 400,
    color: ACCENT,
    textAlign: "right" as const,
    marginTop: 2,
  },

  // Footer
  footer: {
    position: "absolute" as const,
    bottom: MARGIN,
    left: MARGIN,
    right: MARGIN,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "rgba(10,10,10,0.15)",
    borderTopStyle: "solid" as const,
    paddingTop: 12,
  },
  footerText: {
    fontSize: 7,
    fontFamily: "Helvetica",
    fontWeight: 400,
    color: "rgba(10,10,10,0.35)",
  },
});

// ─── Row data ───

interface RubriekRow {
  code: string;
  label: string;
  omzet: number;
  btw: number;
}

// ─── Component ───

export function BtwAangiftePDF({ data }: { data: BtwAangifteData }) {
  const genDate = new Date().toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const sections: { title: string; rows: RubriekRow[] }[] = [
    {
      title: "1. Prestaties binnenland",
      rows: [
        { code: "1a", label: "Leveringen/diensten belast met hoog tarief (21%)", omzet: data.rubriek1a.omzet, btw: data.rubriek1a.btw },
        { code: "1b", label: "Leveringen/diensten belast met laag tarief (9%)", omzet: data.rubriek1b.omzet, btw: data.rubriek1b.btw },
        { code: "1c", label: "Leveringen/diensten belast met overige tarieven (0%)", omzet: data.rubriek1c.omzet, btw: data.rubriek1c.btw },
      ],
    },
    {
      title: "2. Intracommunautaire prestaties",
      rows: [
        { code: "2a", label: "Intracommunautaire leveringen", omzet: data.rubriek2a.omzet, btw: data.rubriek2a.btw },
      ],
    },
    {
      title: "3. Verleggingsregelingen",
      rows: [
        { code: "3b", label: "Verlegging van omzetbelasting (diensten binnen EU)", omzet: data.rubriek3b.omzet, btw: data.rubriek3b.btw },
      ],
    },
    {
      title: "4. Buitenlandse prestaties",
      rows: [
        { code: "4a", label: "Leveringen naar landen buiten de EU", omzet: data.rubriek4a.omzet, btw: data.rubriek4a.btw },
        { code: "4b", label: "Diensten naar landen buiten de EU", omzet: data.rubriek4b.omzet, btw: data.rubriek4b.btw },
      ],
    },
  ];

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.vat100Mark}>VAT100</Text>
          <Text style={s.docType}>BTW Aangifte</Text>
        </View>

        {/* ── Meta ── */}
        <View style={s.metaGrid}>
          <View style={s.metaLeft}>
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Onderneming</Text>
              <Text style={s.metaValueLarge}>{data.naam ?? "—"}</Text>
              {data.btwNummer && (
                <Text style={[s.metaValue, { marginTop: 4 }]}>BTW {data.btwNummer}</Text>
              )}
            </View>
          </View>
          <View style={s.metaRight}>
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Periode</Text>
              <Text style={s.metaValueLarge}>{data.periode}</Text>
            </View>
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Boekjaar</Text>
              <Text style={s.metaValue}>{data.jaar}</Text>
            </View>
          </View>
        </View>

        {/* ── Rubrieken per sectie ── */}
        {sections.map((section, sIdx) => (
          <View key={section.title}>
            <Text style={sIdx === 0 ? s.sectionTitleFirst : s.sectionTitle}>
              {section.title}
            </Text>

            {sIdx === 0 && (
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, s.colRubriek]}>Rubriek</Text>
                <Text style={[s.tableHeaderCell, s.colOmschrijving]}>Omschrijving</Text>
                <Text style={[s.tableHeaderCell, s.colOmzet]}>Omzet</Text>
                <Text style={[s.tableHeaderCell, s.colBtw]}>BTW</Text>
              </View>
            )}

            {section.rows.map((row) => (
              <View style={s.tableRow} key={row.code}>
                <Text style={[s.tableCellMono, s.colRubriek]}>{row.code}</Text>
                <Text style={[s.tableCell, s.colOmschrijving]}>{row.label}</Text>
                <Text style={[s.tableCell, s.colOmzet]}>{fc(row.omzet)}</Text>
                <Text style={[s.tableCell, s.colBtw]}>{fc(row.btw)}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* ── Samenvatting ── */}
        <View style={s.summaryWrap}>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Totaal verschuldigde BTW</Text>
            <Text style={s.summaryValue}>{fc(data.totaalBtw)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Voorbelasting (5b)</Text>
            <Text style={s.summaryValue}>{fc(data.voorbelasting)}</Text>
          </View>
          <View style={s.summaryFinalRow}>
            <Text style={s.summaryFinalLabel}>
              {data.rubriek5g >= 0 ? "Te betalen" : "Terug te ontvangen"} (5g)
            </Text>
            <View>
              <Text style={s.summaryFinalValue}>{fc(Math.abs(data.rubriek5g))}</Text>
              <Text style={s.summaryFinalSub}>
                {data.rubriek5g >= 0 ? "af te dragen aan Belastingdienst" : "te vorderen van Belastingdienst"}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {data.naam}{data.btwNummer ? ` — BTW ${data.btwNummer}` : ""}
          </Text>
          <Text style={s.footerText}>Gegenereerd {genDate}</Text>
          <Text style={s.footerText}>Pagina 1/1</Text>
        </View>
      </Page>
    </Document>
  );
}
