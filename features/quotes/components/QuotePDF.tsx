import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { QuoteData } from "@/lib/types";

const COLOR = "#0D0D0B";
const MARGIN = 56;

const LABEL = {
  fontSize: 10,
  letterSpacing: 0.02 * 10,
  color: "rgba(13,13,11,0.5)",
  fontFamily: "Helvetica",
  fontWeight: 400 as const,
};

const VALUE = {
  fontSize: 12,
  fontFamily: "Helvetica",
  fontWeight: 300 as const,
  color: COLOR,
};

const RULE = {
  borderBottomWidth: 0.5,
  borderBottomColor: COLOR,
  borderBottomStyle: "solid" as const,
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
}

function unitLabel(unit: string): string {
  if (unit === "dagen") return "Dagen";
  if (unit === "uren") return "Uren";
  return "Stuks";
}

const s = StyleSheet.create({
  page: { width: 595, height: 842, paddingTop: MARGIN, paddingBottom: MARGIN, paddingLeft: MARGIN, paddingRight: MARGIN, fontFamily: "Helvetica", fontWeight: 300, color: COLOR, backgroundColor: "#FFFFFF" },
  header: { marginBottom: 24 },
  vat100Mark: { fontFamily: "Courier", fontWeight: 700, fontSize: 120, lineHeight: 0.85, letterSpacing: 0.02 * 120, color: COLOR },
  docType: { fontSize: 14, fontFamily: "Helvetica", fontWeight: 500, letterSpacing: 0.1 * 14, color: COLOR, marginTop: 8 },
  metaRow: { flexDirection: "row", marginBottom: 48, gap: 24 },
  metaCol: { flex: 1 },
  metaLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  metaLabel: { ...LABEL, marginBottom: 4 },
  metaValue: { ...VALUE },
  partiesRow: { flexDirection: "row", marginBottom: 48 },
  partyCol: { flex: 1 },
  partyLabel: { ...LABEL, marginBottom: 6 },
  partyName: { fontSize: 12, fontFamily: "Helvetica", fontWeight: 500, color: COLOR, marginBottom: 2 },
  partyDetail: { fontSize: 12, fontFamily: "Helvetica", fontWeight: 300, color: "rgba(13,13,11,0.5)" },
  tableHeader: { flexDirection: "row", ...RULE, paddingVertical: 8 },
  tableHeaderCell: { ...LABEL },
  tableRow: { flexDirection: "row", paddingVertical: 8 },
  tableRowLast: { flexDirection: "row", ...RULE, paddingVertical: 8 },
  tableCell: { fontSize: 12, fontFamily: "Helvetica", fontWeight: 300, color: "rgba(13,13,11,0.7)" },
  colDesc: { width: "46%" },
  colQty: { width: "10%" },
  colRate: { width: "16%", textAlign: "right" },
  colAmount: { width: "16%", textAlign: "right" },
  colPad: { width: "12%" },
  totalsContainer: { alignItems: "flex-end", marginTop: 8 },
  totalsRow: { flexDirection: "row", width: 220, justifyContent: "space-between", paddingVertical: 4 },
  totalsLabel: { fontSize: 10, fontFamily: "Helvetica", fontWeight: 300, color: "rgba(13,13,11,0.35)" },
  totalsValue: { fontSize: 10, fontFamily: "Helvetica", fontWeight: 300, color: "rgba(13,13,11,0.35)", textAlign: "right" },
  totalRow: { flexDirection: "row", width: 220, justifyContent: "space-between", paddingVertical: 6, borderTopWidth: 0.5, borderTopColor: COLOR, marginTop: 4 },
  totalLabel: { fontSize: 14, fontFamily: "Helvetica", fontWeight: 500, color: COLOR },
  totalValue: { fontSize: 14, fontFamily: "Helvetica", fontWeight: 500, color: COLOR, textAlign: "right" },
  footer: { position: "absolute", bottom: MARGIN, left: MARGIN, right: MARGIN },
  footerLabel: { fontSize: 9, fontFamily: "Helvetica", fontWeight: 400, color: "rgba(13,13,11,0.4)", letterSpacing: 0.02 * 9, marginBottom: 2 },
  footerValue: { fontSize: 9, fontFamily: "Helvetica", fontWeight: 300, color: COLOR, marginBottom: 8 },
  footerRow: { flexDirection: "row" },
  footerCol: { marginRight: 40 },
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

        <View style={s.metaRow}>
          <View style={s.metaCol}>
            <Text style={s.partyName}>{profile.studio_name || profile.full_name}</Text>
            {profile.kvk_number && <Text style={s.partyDetail}>KVK {profile.kvk_number}</Text>}
            {profile.btw_number && <Text style={s.partyDetail}>BTW {profile.btw_number}</Text>}
            {profile.address && <Text style={s.partyDetail}>{profile.address}</Text>}
            {(profile.postal_code || profile.city) && (
              <Text style={s.partyDetail}>{[profile.postal_code, profile.city].filter(Boolean).join(" ")}</Text>
            )}
          </View>
          <View style={s.metaCol}>
            <View style={s.metaLine}>
              <Text style={s.metaLabel}>Offertenr</Text>
              <Text style={s.metaValue}>{quote.quote_number}</Text>
            </View>
            <View style={s.metaLine}>
              <Text style={s.metaLabel}>Offertedatum</Text>
              <Text style={s.metaValue}>{formatDate(quote.issue_date)}</Text>
            </View>
            {quote.valid_until && (
              <View style={s.metaLine}>
                <Text style={s.metaLabel}>Geldig tot</Text>
                <Text style={s.metaValue}>{formatDate(quote.valid_until)}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.partiesRow}>
          <View style={s.partyCol}>
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
            <View style={s.partyCol}>
              <Text style={s.partyLabel}>Omschrijving</Text>
              <Text style={s.partyDetail}>{quote.notes}</Text>
            </View>
          )}
        </View>

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

        <View style={s.totalsContainer}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Subtotaal excl. BTW</Text>
            <Text style={s.totalsValue}>{formatCurrency(quote.subtotal_ex_vat)}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>BTW {quote.vat_rate ?? 21}%</Text>
            <Text style={s.totalsValue}>{formatCurrency(quote.vat_amount)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Totaal incl. BTW</Text>
            <Text style={s.totalValue}>{formatCurrency(quote.total_inc_vat)}</Text>
          </View>
        </View>

        <View style={s.footer}>
          <View style={s.footerRow}>
            <View style={s.footerCol}>
              <Text style={s.footerLabel}>GELDIGHEID</Text>
              <Text style={s.footerValue}>
                {quote.valid_until ? `Tot ${formatDate(quote.valid_until)}` : "30 dagen"}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
