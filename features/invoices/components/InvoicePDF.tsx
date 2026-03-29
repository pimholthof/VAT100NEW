import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { InvoiceData } from "@/lib/types";
import { calculatePaymentDays } from "@/lib/logic/invoice-calculations";
import { formatCurrency, formatDate } from "@/lib/format";

// ─── Tokens ───

const INK = "#000000";
const GREY = "rgba(0,0,0,0.4)";
const RULE = "rgba(0,0,0,0.08)";
const M = 48;
const COL_L = 260;
const COL_R = 499 - COL_L;

function unitLabel(u: string): string {
  return u === "dagen" ? "dagen" : u === "uren" ? "uren" : "stuks";
}

// ─── Styles ───

const s = StyleSheet.create({
  page: { paddingTop: M, paddingBottom: M + 24, paddingLeft: M, paddingRight: M, fontFamily: "Helvetica", color: INK, backgroundColor: "#fff" },

  // Watermark
  wm: { marginBottom: 24 },
  wmT: { fontFamily: "Helvetica", fontWeight: 700, fontSize: 120, letterSpacing: -4.8, color: INK, opacity: 0.045, lineHeight: 0.78 },

  // Grid
  row: { flexDirection: "row" },
  cL: { width: COL_L },
  cR: { width: COL_R },

  // Meta
  meta: { marginBottom: 28 },
  name: { fontSize: 11, fontFamily: "Helvetica", fontWeight: 700, color: INK, marginBottom: 4 },
  line: { fontSize: 8.5, fontFamily: "Helvetica", color: GREY, lineHeight: 1.6 },
  type: { fontSize: 7, fontFamily: "Helvetica", fontWeight: 700, letterSpacing: 1, color: GREY, textTransform: "uppercase", marginBottom: 12 },
  num: { fontSize: 18, fontFamily: "Helvetica", fontWeight: 700, letterSpacing: -0.5, color: INK, marginBottom: 12 },
  pair: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  lbl: { fontSize: 7, fontFamily: "Helvetica", letterSpacing: 1, color: GREY, textTransform: "uppercase" },
  val: { fontSize: 9, fontFamily: "Helvetica", color: INK },

  // Divider
  div: { borderBottomWidth: 0.5, borderBottomColor: RULE, borderBottomStyle: "solid", marginBottom: 20 },

  // Client
  cli: { marginBottom: 24 },
  cliLbl: { fontSize: 7, fontFamily: "Helvetica", letterSpacing: 1, color: GREY, textTransform: "uppercase", marginBottom: 5 },
  cliName: { fontSize: 11, fontFamily: "Helvetica", fontWeight: 700, color: INK, marginBottom: 2 },
  cliLine: { fontSize: 8.5, fontFamily: "Helvetica", color: GREY, lineHeight: 1.6 },

  // Notes
  notes: { marginBottom: 20 },
  notesLbl: { fontSize: 7, fontFamily: "Helvetica", letterSpacing: 1, color: GREY, textTransform: "uppercase", marginBottom: 4 },
  notesBody: { fontSize: 8.5, fontFamily: "Helvetica", color: GREY, lineHeight: 1.6 },

  // Table
  tbl: { marginBottom: 8 },
  thead: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: INK, paddingBottom: 6 },
  tr: { flexDirection: "row", paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: RULE },
  trLast: { flexDirection: "row", paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: INK },
  th: { fontSize: 7, fontFamily: "Helvetica", letterSpacing: 1, color: GREY, textTransform: "uppercase" },
  td: { fontSize: 9, fontFamily: "Helvetica", color: INK },
  cDesc: { width: "48%" },
  cQty: { width: "14%" },
  cRate: { width: "18%", textAlign: "right" },
  cAmt: { width: "20%", textAlign: "right" },

  // Totals
  totWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  totBlock: { width: COL_R },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totLbl: { fontSize: 7, fontFamily: "Helvetica", letterSpacing: 1, color: GREY, textTransform: "uppercase" },
  totVal: { fontSize: 9, fontFamily: "Helvetica", color: GREY, textAlign: "right" },
  totFinal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: INK },
  totFLbl: { fontSize: 9, fontFamily: "Helvetica", fontWeight: 700, letterSpacing: 1, color: INK, textTransform: "uppercase" },
  totFVal: { fontSize: 14, fontFamily: "Helvetica", fontWeight: 700, color: INK, textAlign: "right" },

  // Footer
  foot: { position: "absolute", bottom: M, left: M, right: M, flexDirection: "row", borderTopWidth: 0.5, borderTopColor: RULE, borderTopStyle: "solid", paddingTop: 10, gap: 32 },
  footLbl: { fontSize: 6, fontFamily: "Helvetica", letterSpacing: 1, color: GREY, textTransform: "uppercase", marginBottom: 2 },
  footVal: { fontSize: 8, fontFamily: "Helvetica", color: INK },
});

// ─── Component ───

export function InvoicePDF({ data }: { data: InvoiceData }) {
  const { invoice, lines, client, profile } = data;
  const cr = invoice.is_credit_note;
  const days = calculatePaymentDays({ issueDate: invoice.issue_date, dueDate: invoice.due_date, defaultDays: 30 });
  const showContact = client.contact_name && client.contact_name.toLowerCase() !== client.name.toLowerCase();

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.wm}><Text style={s.wmT}>VAT100</Text></View>

        {/* Meta grid */}
        <View style={[s.row, s.meta]}>
          <View style={s.cL}>
            <Text style={s.name}>{profile.studio_name || profile.full_name}</Text>
            {profile.kvk_number && <Text style={s.line}>KVK {profile.kvk_number}</Text>}
            {profile.btw_number && <Text style={s.line}>BTW {profile.btw_number}</Text>}
            {profile.address && <Text style={s.line}>{profile.address}</Text>}
            {(profile.postal_code || profile.city) && (
              <Text style={s.line}>{[profile.postal_code, profile.city].filter(Boolean).join(" ")}</Text>
            )}
          </View>
          <View style={s.cR}>
            <Text style={s.type}>{cr ? "Creditnota" : "Factuur"}</Text>
            <Text style={s.num}>{invoice.invoice_number}</Text>
            <View style={s.pair}>
              <Text style={s.lbl}>Datum</Text>
              <Text style={s.val}>{formatDate(invoice.issue_date)}</Text>
            </View>
            {invoice.due_date && (
              <View style={s.pair}>
                <Text style={s.lbl}>Vervaldatum</Text>
                <Text style={s.val}>{formatDate(invoice.due_date)}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.div} />

        {/* Client */}
        <View style={s.cli}>
          <Text style={s.cliLbl}>Aan</Text>
          <Text style={s.cliName}>{client.name}</Text>
          {showContact && <Text style={s.cliLine}>{client.contact_name}</Text>}
          {client.address && <Text style={s.cliLine}>{client.address}</Text>}
          {(client.postal_code || client.city) && (
            <Text style={s.cliLine}>{[client.postal_code, client.city].filter(Boolean).join(" ")}</Text>
          )}
          {client.kvk_number && <Text style={s.cliLine}>KVK {client.kvk_number}</Text>}
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={s.notes}>
            <Text style={s.notesLbl}>Omschrijving</Text>
            <Text style={s.notesBody}>{invoice.notes}</Text>
          </View>
        )}

        {/* Table */}
        <View style={s.tbl}>
          <View style={s.thead}>
            <Text style={[s.th, s.cDesc]}>Omschrijving</Text>
            <Text style={[s.th, s.cQty]}>Aantal</Text>
            <Text style={[s.th, s.cRate]}>Tarief</Text>
            <Text style={[s.th, s.cAmt]}>Bedrag</Text>
          </View>
          {lines.map((l, i) => (
            <View style={i === lines.length - 1 ? s.trLast : s.tr} key={l.id}>
              <Text style={[s.td, s.cDesc]}>{l.description}</Text>
              <Text style={[s.td, s.cQty]}>{l.quantity} {unitLabel(l.unit)}</Text>
              <Text style={[s.td, s.cRate]}>{formatCurrency(l.rate)}</Text>
              <Text style={[s.td, s.cAmt]}>{formatCurrency(l.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totWrap}>
          <View style={s.totBlock}>
            <View style={s.totRow}>
              <Text style={s.totLbl}>Subtotaal</Text>
              <Text style={s.totVal}>{formatCurrency(invoice.subtotal_ex_vat)}</Text>
            </View>
            <View style={s.totRow}>
              <Text style={s.totLbl}>BTW {invoice.vat_rate ?? 21}%</Text>
              <Text style={s.totVal}>{formatCurrency(invoice.vat_amount)}</Text>
            </View>
            <View style={s.totFinal}>
              <Text style={s.totFLbl}>Totaal</Text>
              <Text style={s.totFVal}>{formatCurrency(invoice.total_inc_vat)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.foot}>
          {profile.iban && <View><Text style={s.footLbl}>IBAN</Text><Text style={s.footVal}>{profile.iban}</Text></View>}
          {profile.bic && <View><Text style={s.footLbl}>BIC</Text><Text style={s.footVal}>{profile.bic}</Text></View>}
          <View><Text style={s.footLbl}>Betaaltermijn</Text><Text style={s.footVal}>{days} dagen</Text></View>
        </View>
      </Page>
    </Document>
  );
}
