import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { QuoteData } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

const COLOR = "#000000";
const ACCENT = "#A51C30";
const MARGIN = 56;

const LABEL = {
  fontSize: 10,
  letterSpacing: 0.14 * 10,
  color: "rgba(0,0,0,0.5)",
  fontFamily: "Helvetica",
  fontWeight: 400 as const,
  textTransform: "uppercase" as const,
};

const VALUE = {
  fontSize: 11,
  fontFamily: "Helvetica",
  fontWeight: 400 as const,
  color: COLOR,
};

const HERO = {
  fontFamily: "Helvetica",
  fontWeight: 700 as const,
  fontSize: 48,
  letterSpacing: -0.04 * 48,
  color: COLOR,
};

const RULE = {
  borderBottomWidth: 0.5,
  borderBottomColor: COLOR,
  borderBottomStyle: "solid" as const,
};

const RULE_THIN = {
  borderBottomWidth: 0.5,
  borderBottomColor: "rgba(0,0,0,0.08)",
  borderBottomStyle: "solid" as const,
};

function unitLabel(unit: string): string {
  if (unit === "dagen") return "Dagen";
  if (unit === "uren") return "Uren";
  return "Stuks";
}

const s = StyleSheet.create({
  page: {
    width: 595,
    height: 842,
    paddingTop: MARGIN,
    paddingBottom: MARGIN,
    paddingLeft: MARGIN,
    paddingRight: MARGIN,
    fontFamily: "Helvetica",
    fontWeight: 400,
    color: COLOR,
    backgroundColor: "#FFFFFF",
  },

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
    textTransform: "uppercase",
  },

  metaGrid: {
    flexDirection: "row",
    marginBottom: 64,
    gap: 48,
  },
  metaLeft: {
    width: "55%",
  },
  metaRight: {
    flex: 1,
  },
  metaBlock: {
    marginBottom: 32,
  },
  metaLabel: {
    ...LABEL,
    marginBottom: 8,
  },
  metaValue: {
    ...VALUE,
    lineHeight: 1.4,
  },
  metaValueLarge: {
    fontSize: 24,
    fontFamily: "Helvetica",
    fontWeight: 700,
    letterSpacing: -0.02 * 24,
    color: COLOR,
  },

  partiesSection: {
    flexDirection: "row",
    marginBottom: 64,
    gap: 40,
  },
  partyBlock: {
    flex: 1,
  },
  partyLabel: {
    ...LABEL,
    marginBottom: 12,
  },
  partyName: {
    fontSize: 16,
    fontFamily: "Helvetica",
    fontWeight: 700,
    color: COLOR,
    letterSpacing: -0.01 * 16,
    marginBottom: 4,
  },
  partyDetail: {
    fontSize: 10,
    fontFamily: "Helvetica",
    fontWeight: 400,
    color: "rgba(0,0,0,0.5)",
    lineHeight: 1.5,
  },

  tableSection: {
    marginBottom: 48,
  },
  tableHeader: {
    flexDirection: "row",
    ...RULE,
    paddingVertical: 12,
  },
  tableHeaderCell: {
    ...LABEL,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    ...RULE_THIN,
  },
  tableRowLast: {
    flexDirection: "row",
    paddingVertical: 12,
    ...RULE,
  },
  tableCell: {
    fontSize: 10,
    fontFamily: "Helvetica",
    fontWeight: 400,
    color: COLOR,
    lineHeight: 1.4,
  },

  colDesc: { width: "50%" },
  colQty: { width: "10%" },
  colRate: { width: "15%", textAlign: "right" },
  colAmount: { width: "20%", textAlign: "right" },
  colPad: { width: "5%" },

  totalsSection: {
    alignItems: "flex-end",
    marginTop: 32,
  },
  totalsGrid: {
    width: 280,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  totalsLabel: {
    ...LABEL,
    fontSize: 8,
    color: "rgba(0,0,0,0.5)",
  },
  totalsValue: {
    fontSize: 11,
    fontFamily: "Helvetica",
    fontWeight: 400,
    color: "rgba(0,0,0,0.5)",
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: COLOR,
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: "Helvetica",
    fontWeight: 700,
    letterSpacing: 0.1 * 11,
    color: COLOR,
    textTransform: "uppercase",
  },
  totalValue: {
    fontSize: 20,
    fontFamily: "Helvetica",
    fontWeight: 700,
    letterSpacing: -0.02 * 20,
    color: COLOR,
    textAlign: "right",
  },

  footer: {
    position: "absolute",
    bottom: MARGIN,
    left: MARGIN,
    right: MARGIN,
    flexDirection: "row",
    justifyContent: "space-between",
    ...RULE_THIN,
    paddingTop: 16,
  },
  footerCol: {},
  footerLabel: {
    ...LABEL,
    fontSize: 7,
    marginBottom: 4,
  },
  footerValue: {
    fontSize: 9,
    fontFamily: "Helvetica",
    fontWeight: 400,
    color: COLOR,
  },
});

export function QuotePDF({ data }: { data: QuoteData }) {
  const { quote, lines, client, profile } = data;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.vat100Mark}>VAT100</Text>
          <Text style={s.docType}>OFFERTE</Text>
        </View>

        <View style={s.metaGrid}>
          <View style={s.metaLeft}>
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Van</Text>
              <Text style={s.metaValueLarge}>{profile.studio_name || profile.full_name}</Text>
              {profile.kvk_number && <Text style={s.metaValue}>KVK {profile.kvk_number}</Text>}
              {profile.btw_number && <Text style={s.metaValue}>BTW {profile.btw_number}</Text>}
              {profile.address && <Text style={s.metaValue}>{profile.address}</Text>}
              {(profile.postal_code || profile.city) && (
                <Text style={s.metaValue}>{[profile.postal_code, profile.city].filter(Boolean).join(" ")}</Text>
              )}
            </View>
          </View>
          <View style={s.metaRight}>
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Offertenr</Text>
              <Text style={s.metaValueLarge}>{quote.quote_number}</Text>
            </View>
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Datum</Text>
              <Text style={s.metaValue}>{formatDate(quote.issue_date)}</Text>
            </View>
            {quote.valid_until && (
              <View style={s.metaBlock}>
                <Text style={s.metaLabel}>Geldig tot</Text>
                <Text style={s.metaValue}>{formatDate(quote.valid_until)}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.partiesSection}>
          <View style={s.partyBlock}>
            <Text style={s.partyLabel}>Aan</Text>
            <Text style={s.partyName}>{client.name}</Text>
            {client.contact_name && <Text style={s.partyDetail}>{client.contact_name}</Text>}
            {client.address && <Text style={s.partyDetail}>{client.address}</Text>}
            {(client.postal_code || client.city) && (
              <Text style={s.partyDetail}>{[client.postal_code, client.city].filter(Boolean).join(" ")}</Text>
            )}
            {client.kvk_number && <Text style={s.partyDetail}>KVK {client.kvk_number}</Text>}
          </View>
          {quote.notes && (
            <View style={s.partyBlock}>
              <Text style={s.partyLabel}>Omschrijving</Text>
              <Text style={s.partyDetail}>{quote.notes}</Text>
            </View>
          )}
        </View>

        <View style={s.tableSection}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, s.colDesc]}>Omschrijving</Text>
            <Text style={[s.tableHeaderCell, s.colQty]}>Aantal</Text>
            <Text style={[s.tableHeaderCell, s.colRate]}>Tarief</Text>
            <Text style={[s.tableHeaderCell, s.colAmount]}>Bedrag</Text>
            <Text style={s.colPad} />
          </View>

          {lines.map((line, i) => (
            <View style={i === lines.length - 1 ? s.tableRowLast : s.tableRow} key={line.id}>
              <Text style={[s.tableCell, s.colDesc]}>{line.description}</Text>
              <Text style={[s.tableCell, s.colQty]}>{line.quantity} {unitLabel(line.unit).toLowerCase()}</Text>
              <Text style={[s.tableCell, s.colRate]}>{formatCurrency(line.rate)}</Text>
              <Text style={[s.tableCell, s.colAmount]}>{formatCurrency(line.amount)}</Text>
              <Text style={s.colPad} />
            </View>
          ))}
        </View>

        <View style={s.totalsSection}>
          <View style={s.totalsGrid}>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Subtotaal excl. BTW</Text>
              <Text style={s.totalsValue}>{formatCurrency(quote.subtotal_ex_vat)}</Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>BTW {quote.vat_rate ?? 21}%</Text>
              <Text style={s.totalsValue}>{formatCurrency(quote.vat_amount)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Totaal</Text>
              <Text style={s.totalValue}>{formatCurrency(quote.total_inc_vat)}</Text>
            </View>
          </View>
        </View>

        <View style={s.footer}>
          <View style={s.footerCol}>
            <Text style={s.footerLabel}>Geldigheid</Text>
            <Text style={s.footerValue}>
              {quote.valid_until ? `Tot ${formatDate(quote.valid_until)}` : "30 dagen"}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
