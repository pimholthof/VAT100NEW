import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { InvoiceData, InvoiceTemplate } from "@/lib/types";
import type { Locale } from "@/lib/i18n/types";
import { getDictionary } from "@/lib/i18n";
import { calculatePaymentDays } from "@/lib/logic/invoice-calculations";
import { formatCurrency, formatDate } from "@/lib/format";

function unitLabel(u: string): string {
  return u === "dagen" ? "dagen" : u === "uren" ? "uren" : "stuks";
}

function fmtDateLong(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

// ─── Dispatcher ───

export function InvoicePDF({ data, template = "minimaal", locale = "nl" }: { data: InvoiceData; template?: InvoiceTemplate; locale?: Locale }) {
  switch (template) {
    case "klassiek": return <KlassiekPDF data={data} locale={locale} />;
    case "strak": return <StrakPDF data={data} locale={locale} />;
    case "poster": return <PosterPDF data={data} locale={locale} />;
    default: return <MinimaalPDF data={data} locale={locale} />;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEMPLATE 1: MINIMAAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const INK1 = "#000000";
const GREY1 = "rgba(0,0,0,0.4)";
const RULE1 = "rgba(0,0,0,0.08)";
const M1 = 48;
const COL_R1 = 239;
const COL_L1 = 260;

const s1 = StyleSheet.create({
  page: { paddingTop: M1, paddingBottom: M1 + 24, paddingLeft: M1, paddingRight: M1, fontFamily: "Helvetica", color: INK1, backgroundColor: "#fff" },
  wm: { marginBottom: 24 },
  wmT: { fontWeight: 700, fontSize: 120, letterSpacing: -4.8, color: INK1, opacity: 0.045, lineHeight: 0.78 },
  row: { flexDirection: "row" },
  meta: { marginBottom: 28 },
  cL: { width: COL_L1 },
  cR: { width: COL_R1 },
  name: { fontSize: 11, fontWeight: 700, color: INK1, marginBottom: 4 },
  line: { fontSize: 8.5, color: GREY1, lineHeight: 1.6 },
  type: { fontSize: 7, fontWeight: 700, letterSpacing: 1, color: GREY1, textTransform: "uppercase", marginBottom: 12 },
  num: { fontSize: 18, fontWeight: 700, letterSpacing: -0.5, color: INK1, marginBottom: 12 },
  pair: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  lbl: { fontSize: 7, letterSpacing: 1, color: GREY1, textTransform: "uppercase" },
  val: { fontSize: 9, color: INK1 },
  div: { borderBottomWidth: 0.5, borderBottomColor: RULE1, borderBottomStyle: "solid", marginBottom: 20 },
  cli: { marginBottom: 24 },
  cliLbl: { fontSize: 7, letterSpacing: 1, color: GREY1, textTransform: "uppercase", marginBottom: 5 },
  cliName: { fontSize: 11, fontWeight: 700, color: INK1, marginBottom: 2 },
  cliLine: { fontSize: 8.5, color: GREY1, lineHeight: 1.6 },
  notes: { marginBottom: 20 },
  notesLbl: { fontSize: 7, letterSpacing: 1, color: GREY1, textTransform: "uppercase", marginBottom: 4 },
  notesBody: { fontSize: 8.5, color: GREY1, lineHeight: 1.6 },
  tbl: { marginBottom: 8 },
  thead: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: INK1, paddingBottom: 6 },
  tr: { flexDirection: "row", paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: RULE1 },
  trLast: { flexDirection: "row", paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: INK1 },
  th: { fontSize: 7, letterSpacing: 1, color: GREY1, textTransform: "uppercase" },
  td: { fontSize: 9, color: INK1 },
  cDesc: { width: "48%" },
  cQty: { width: "14%" },
  cRate: { width: "18%", textAlign: "right" },
  cAmt: { width: "20%", textAlign: "right" },
  totWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  totBlock: { width: COL_R1 },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totLbl: { fontSize: 7, letterSpacing: 1, color: GREY1, textTransform: "uppercase" },
  totVal: { fontSize: 9, color: GREY1, textAlign: "right" },
  totFinal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: INK1 },
  totFLbl: { fontSize: 9, fontWeight: 700, letterSpacing: 1, color: INK1, textTransform: "uppercase" },
  totFVal: { fontSize: 14, fontWeight: 700, color: INK1, textAlign: "right" },
  foot: { position: "absolute", bottom: M1, left: M1, right: M1, flexDirection: "row", borderTopWidth: 0.5, borderTopColor: RULE1, borderTopStyle: "solid", paddingTop: 10, gap: 32 },
  footLbl: { fontSize: 6, letterSpacing: 1, color: GREY1, textTransform: "uppercase", marginBottom: 2 },
  footVal: { fontSize: 8, color: INK1 },
});

function MinimaalPDF({ data, locale }: { data: InvoiceData; locale: Locale }) {
  const t = getDictionary(locale);
  const { invoice, lines, client, profile } = data;
  const cr = invoice.is_credit_note;
  const days = calculatePaymentDays({ issueDate: invoice.issue_date, dueDate: invoice.due_date, defaultDays: 30 });
  const showContact = client.contact_name && client.contact_name.toLowerCase() !== client.name.toLowerCase();

  return (
    <Document>
      <Page size="A4" style={s1.page}>
        <View style={s1.wm}><Text style={s1.wmT}>VAT100</Text></View>
        <View style={[s1.row, s1.meta]}>
          <View style={s1.cL}>
            <Text style={s1.name}>{profile.studio_name || profile.full_name}</Text>
            {profile.kvk_number && <Text style={s1.line}>KVK {profile.kvk_number}</Text>}
            {profile.btw_number && <Text style={s1.line}>BTW {profile.btw_number}</Text>}
            {profile.address && <Text style={s1.line}>{profile.address}</Text>}
            {(profile.postal_code || profile.city) && <Text style={s1.line}>{[profile.postal_code, profile.city].filter(Boolean).join(" ")}</Text>}
          </View>
          <View style={s1.cR}>
            <Text style={s1.type}>{cr ? t.invoiceDoc.creditNote : t.invoiceDoc.invoice}</Text>
            <Text style={s1.num}>{invoice.invoice_number}</Text>
            <View style={s1.pair}><Text style={s1.lbl}>{t.invoiceDoc.date}</Text><Text style={s1.val}>{formatDate(invoice.issue_date)}</Text></View>
            {invoice.due_date && <View style={s1.pair}><Text style={s1.lbl}>{t.invoiceDoc.dueDate}</Text><Text style={s1.val}>{formatDate(invoice.due_date)}</Text></View>}
          </View>
        </View>
        <View style={s1.div} />
        <View style={s1.cli}>
          <Text style={s1.cliLbl}>{t.invoiceDoc.to}</Text>
          <Text style={s1.cliName}>{client.name}</Text>
          {showContact && <Text style={s1.cliLine}>{client.contact_name}</Text>}
          {client.address && <Text style={s1.cliLine}>{client.address}</Text>}
          {(client.postal_code || client.city) && <Text style={s1.cliLine}>{[client.postal_code, client.city].filter(Boolean).join(" ")}</Text>}
          {client.kvk_number && <Text style={s1.cliLine}>KVK {client.kvk_number}</Text>}
        </View>
        {invoice.notes && <View style={s1.notes}><Text style={s1.notesLbl}>{t.invoiceDoc.description}</Text><Text style={s1.notesBody}>{invoice.notes}</Text></View>}
        <View style={s1.tbl}>
          <View style={s1.thead}>
            <Text style={[s1.th, s1.cDesc]}>{t.invoiceDoc.description}</Text>
            <Text style={[s1.th, s1.cQty]}>{t.invoiceDoc.quantity}</Text>
            <Text style={[s1.th, s1.cRate]}>{t.invoiceDoc.rate}</Text>
            <Text style={[s1.th, s1.cAmt]}>{t.invoiceDoc.amount}</Text>
          </View>
          {lines.map((l, i) => (
            <View style={i === lines.length - 1 ? s1.trLast : s1.tr} key={l.id}>
              <Text style={[s1.td, s1.cDesc]}>{l.description}</Text>
              <Text style={[s1.td, s1.cQty]}>{l.quantity} {unitLabel(l.unit)}</Text>
              <Text style={[s1.td, s1.cRate]}>{formatCurrency(l.rate)}</Text>
              <Text style={[s1.td, s1.cAmt]}>{formatCurrency(l.amount)}</Text>
            </View>
          ))}
        </View>
        <View style={s1.totWrap}>
          <View style={s1.totBlock}>
            <View style={s1.totRow}><Text style={s1.totLbl}>{t.invoiceDoc.subtotalExVat}</Text><Text style={s1.totVal}>{formatCurrency(invoice.subtotal_ex_vat)}</Text></View>
            <View style={s1.totRow}><Text style={s1.totLbl}>{t.invoiceDoc.vat} {invoice.vat_rate ?? 21}%</Text><Text style={s1.totVal}>{formatCurrency(invoice.vat_amount)}</Text></View>
            <View style={s1.totFinal}><Text style={s1.totFLbl}>{t.invoiceDoc.total}</Text><Text style={s1.totFVal}>{formatCurrency(invoice.total_inc_vat)}</Text></View>
          </View>
        </View>
        <View style={s1.foot}>
          {profile.iban && <View><Text style={s1.footLbl}>IBAN</Text><Text style={s1.footVal}>{profile.iban}</Text></View>}
          {profile.bic && <View><Text style={s1.footLbl}>BIC</Text><Text style={s1.footVal}>{profile.bic}</Text></View>}
          <View><Text style={s1.footLbl}>{t.invoiceDoc.paymentTerms}</Text><Text style={s1.footVal}>{days} {t.invoiceDoc.daysNet}</Text></View>
        </View>
      </Page>
    </Document>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEMPLATE 2: KLASSIEK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const INK2 = "#000000";
const GREY2 = "rgba(0,0,0,0.45)";
const RULE2 = "rgba(0,0,0,0.1)";
const M2 = 48;

const s2 = StyleSheet.create({
  page: { paddingTop: 56, paddingBottom: M2 + 24, paddingLeft: M2, paddingRight: M2, fontFamily: "Helvetica", color: INK2, backgroundColor: "#FAFAF8" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 48 },
  title: { fontSize: 56, fontWeight: 700, letterSpacing: -2.2, lineHeight: 0.9 },
  headerRight: { textAlign: "right", paddingTop: 8 },
  headerDate: { fontSize: 9, color: GREY2, marginBottom: 4 },
  headerNum: { fontSize: 11, fontWeight: 700 },
  cols: { flexDirection: "row", gap: 40, marginBottom: 20 },
  col: { flex: 1 },
  lbl: { fontSize: 7.5, letterSpacing: 0.75, color: GREY2, textTransform: "uppercase", marginBottom: 8 },
  name: { fontSize: 10, fontWeight: 700, marginBottom: 2 },
  line: { fontSize: 9, color: GREY2, lineHeight: 1.7 },
  lineMt: { fontSize: 9, color: GREY2, lineHeight: 1.7, marginTop: 4 },
  div: { borderBottomWidth: 0.5, borderBottomColor: RULE2, marginBottom: 32 },
  notesBody: { fontSize: 9, color: GREY2, lineHeight: 1.7, marginBottom: 24 },
  tbl: { marginBottom: 24 },
  thead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: INK2, paddingBottom: 8 },
  tr: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: RULE2 },
  trLast: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: INK2 },
  th: { fontSize: 7.5, letterSpacing: 0.75, color: GREY2, textTransform: "uppercase" },
  td: { fontSize: 9, color: INK2 },
  tdGrey: { fontSize: 9, color: GREY2 },
  tdBold: { fontSize: 10, fontWeight: 700 },
  cDesc: { width: "46%" },
  cQty: { width: "16%", textAlign: "center" },
  cRate: { width: "18%", textAlign: "right" },
  cAmt: { width: "20%", textAlign: "right" },
  totWrap: { flexDirection: "row", justifyContent: "flex-end" },
  totBlock: { width: 240 },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  totLbl: { fontSize: 7.5, letterSpacing: 0.75, color: GREY2, textTransform: "uppercase" },
  totVal: { fontSize: 9, color: GREY2 },
  totFinal: { flexDirection: "row", justifyContent: "space-between", paddingTop: 10, marginTop: 6, borderTopWidth: 1.5, borderTopColor: INK2 },
  totFLbl: { fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" },
  totFVal: { fontSize: 16, fontWeight: 700 },
  due: { marginTop: 40 },
  dueText: { fontSize: 8.5, color: GREY2 },
  foot: { position: "absolute", bottom: M2, left: M2, right: M2, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: RULE2, paddingTop: 12 },
  footLeft: { flexDirection: "row", gap: 32 },
  footLbl: { fontSize: 6.5, letterSpacing: 0.75, color: GREY2, textTransform: "uppercase", marginBottom: 2 },
  footVal: { fontSize: 8.5, fontWeight: 700 },
  footRight: { fontSize: 7, color: GREY2, alignSelf: "flex-end" },
});

function KlassiekPDF({ data, locale }: { data: InvoiceData; locale: Locale }) {
  const t = getDictionary(locale);
  const { invoice, lines, client, profile } = data;
  const cr = invoice.is_credit_note;
  const days = calculatePaymentDays({ issueDate: invoice.issue_date, dueDate: invoice.due_date, defaultDays: 30 });
  const showContact = client.contact_name && client.contact_name.toLowerCase() !== client.name.toLowerCase();

  return (
    <Document>
      <Page size="A4" style={s2.page}>
        <View style={s2.header}>
          <View>
            <Text style={s2.title}>VAT100</Text>
            <Text style={{ fontSize: 8, letterSpacing: 1, color: GREY2, textTransform: "uppercase", marginTop: 8 }}>{cr ? t.invoiceDoc.creditNote : t.invoiceDoc.invoice}</Text>
          </View>
          <View style={s2.headerRight}>
            <Text style={s2.headerDate}>{fmtDateLong(invoice.issue_date)}</Text>
            <Text style={s2.headerNum}>Nr. {invoice.invoice_number}</Text>
          </View>
        </View>

        <View style={s2.cols}>
          <View style={s2.col}>
            <Text style={s2.lbl}>{t.invoiceDoc.from}</Text>
            <Text style={s2.name}>{profile.studio_name || profile.full_name}</Text>
            {profile.address && <Text style={s2.line}>{profile.address}</Text>}
            {(profile.postal_code || profile.city) && <Text style={s2.line}>{[profile.postal_code, profile.city].filter(Boolean).join(" ")}</Text>}
            {profile.kvk_number && <Text style={s2.lineMt}>KVK {profile.kvk_number}</Text>}
            {profile.btw_number && <Text style={s2.line}>BTW {profile.btw_number}</Text>}
          </View>
          <View style={s2.col}>
            <Text style={s2.lbl}>{t.invoiceDoc.to}</Text>
            <Text style={s2.name}>{client.name}</Text>
            {showContact && <Text style={s2.line}>{client.contact_name}</Text>}
            {client.address && <Text style={s2.line}>{client.address}</Text>}
            {(client.postal_code || client.city) && <Text style={s2.line}>{[client.postal_code, client.city].filter(Boolean).join(" ")}</Text>}
            {client.kvk_number && <Text style={s2.lineMt}>KVK {client.kvk_number}</Text>}
          </View>
        </View>

        <View style={s2.div} />
        {invoice.notes && <Text style={s2.notesBody}>{invoice.notes}</Text>}

        <View style={s2.tbl}>
          <View style={s2.thead}>
            <Text style={[s2.th, s2.cDesc]}>{t.invoiceDoc.description}</Text>
            <Text style={[s2.th, s2.cQty]}>{t.invoiceDoc.quantity}</Text>
            <Text style={[s2.th, s2.cRate]}>{t.invoiceDoc.rate}</Text>
            <Text style={[s2.th, s2.cAmt]}>{t.invoiceDoc.amount}</Text>
          </View>
          {lines.map((l, i) => (
            <View style={i === lines.length - 1 ? s2.trLast : s2.tr} key={l.id}>
              <Text style={[s2.td, s2.cDesc]}>{l.description}</Text>
              <Text style={[s2.tdGrey, s2.cQty]}>{l.quantity} {unitLabel(l.unit)}</Text>
              <Text style={[s2.tdGrey, s2.cRate]}>{formatCurrency(l.rate)}</Text>
              <Text style={[s2.tdBold, s2.cAmt]}>{formatCurrency(l.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={s2.totWrap}>
          <View style={s2.totBlock}>
            <View style={s2.totRow}><Text style={s2.totLbl}>{t.invoiceDoc.subtotalExVat}</Text><Text style={s2.totVal}>{formatCurrency(invoice.subtotal_ex_vat)}</Text></View>
            <View style={s2.totRow}><Text style={s2.totLbl}>{t.invoiceDoc.vat} {invoice.vat_rate ?? 21}%</Text><Text style={s2.totVal}>{formatCurrency(invoice.vat_amount)}</Text></View>
            <View style={s2.totFinal}><Text style={s2.totFLbl}>{t.invoiceDoc.total}</Text><Text style={s2.totFVal}>{formatCurrency(invoice.total_inc_vat)}</Text></View>
          </View>
        </View>

        {invoice.due_date && <View style={s2.due}><Text style={s2.dueText}>{t.invoiceDoc.paymentTerms}: {fmtDateLong(invoice.due_date)}</Text></View>}

        <View style={s2.foot}>
          <View style={s2.footLeft}>
            {profile.iban && <View><Text style={s2.footLbl}>IBAN</Text><Text style={s2.footVal}>{profile.iban}</Text></View>}
            {profile.bic && <View><Text style={s2.footLbl}>BIC</Text><Text style={s2.footVal}>{profile.bic}</Text></View>}
            <View><Text style={s2.footLbl}>{t.invoiceDoc.paymentTerms}</Text><Text style={s2.footVal}>{days} {t.invoiceDoc.daysNet}</Text></View>
          </View>
          <Text style={s2.footRight}>{profile.studio_name || profile.full_name}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEMPLATE 3: STRAK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const INK3 = "#1A1A1A";
const GREY3 = "rgba(0,0,0,0.35)";
const RULE3 = "rgba(0,0,0,0.06)";
const M3 = 56;

const s3 = StyleSheet.create({
  page: { paddingTop: 64, paddingBottom: M3 + 24, paddingLeft: M3, paddingRight: M3, fontFamily: "Helvetica", color: INK3, backgroundColor: "#FAF9F6" },
  studio: { marginBottom: 64 },
  studioName: { fontSize: 48, fontWeight: 700, letterSpacing: -1.9, lineHeight: 0.85 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 48, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: RULE3 },
  metaCol: { textAlign: "right" },
  lbl: { fontSize: 6.5, letterSpacing: 1, color: GREY3, textTransform: "uppercase", marginBottom: 6 },
  metaNum: { fontSize: 13, fontWeight: 700, letterSpacing: -0.3 },
  metaVal: { fontSize: 9 },
  cli: { marginBottom: 48 },
  cliName: { fontSize: 10, fontWeight: 700, marginBottom: 2 },
  cliLine: { fontSize: 8, color: GREY3, lineHeight: 1.8 },
  notesBody: { fontSize: 8.5, color: GREY3, lineHeight: 1.7, marginBottom: 32 },
  tbl: { marginBottom: 32 },
  thead: { flexDirection: "row", paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: RULE3 },
  tr: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: RULE3 },
  th: { fontSize: 6.5, letterSpacing: 1, color: GREY3, textTransform: "uppercase" },
  td: { fontSize: 9 },
  tdGrey: { fontSize: 8, color: GREY3 },
  tdBold: { fontSize: 9, fontWeight: 700 },
  cDesc: { width: "50%" },
  cQty: { width: "14%", textAlign: "right" },
  cRate: { width: "18%", textAlign: "right" },
  cAmt: { width: "18%", textAlign: "right" },
  totWrap: { flexDirection: "row", justifyContent: "flex-end" },
  totBlock: { width: 200 },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  totLbl: { fontSize: 6.5, letterSpacing: 1, color: GREY3, textTransform: "uppercase" },
  totVal: { fontSize: 8, color: GREY3 },
  totFinal: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8, marginTop: 8, borderTopWidth: 0.5, borderTopColor: INK3 },
  totFLbl: { fontSize: 6.5, letterSpacing: 1, color: INK3, textTransform: "uppercase", fontWeight: 700 },
  totFVal: { fontSize: 13, fontWeight: 700 },
  foot: { position: "absolute", bottom: M3, left: M3, right: M3, borderTopWidth: 0.5, borderTopColor: RULE3, paddingTop: 12, flexDirection: "row", justifyContent: "space-between" },
  footLeft: {},
  footName: { fontSize: 8, fontWeight: 700, marginBottom: 1 },
  footAddr: { fontSize: 7, color: GREY3 },
  footRight: { flexDirection: "row", gap: 24, alignItems: "flex-start" },
  footLbl: { fontSize: 6, letterSpacing: 1, color: GREY3, textTransform: "uppercase", marginBottom: 2 },
  footVal: { fontSize: 7.5, color: INK3 },
});

function StrakPDF({ data, locale }: { data: InvoiceData; locale: Locale }) {
  const t = getDictionary(locale);
  const { invoice, lines, client, profile } = data;
  const cr = invoice.is_credit_note;
  const days = calculatePaymentDays({ issueDate: invoice.issue_date, dueDate: invoice.due_date, defaultDays: 30 });
  const showContact = client.contact_name && client.contact_name.toLowerCase() !== client.name.toLowerCase();

  return (
    <Document>
      <Page size="A4" style={s3.page}>
        <View style={s3.studio}>
          <Text style={s3.studioName}>VAT100</Text>
        </View>

        <View style={s3.metaRow}>
          <View>
            <Text style={s3.lbl}>{cr ? t.invoiceDoc.creditNote : t.invoiceDoc.invoice}</Text>
            <Text style={s3.metaNum}>{invoice.invoice_number}</Text>
          </View>
          <View style={s3.metaCol}>
            <Text style={s3.lbl}>{t.invoiceDoc.date}</Text>
            <Text style={s3.metaVal}>{formatDate(invoice.issue_date)}</Text>
          </View>
          {invoice.due_date && (
            <View style={s3.metaCol}>
              <Text style={s3.lbl}>{t.invoiceDoc.dueDate}</Text>
              <Text style={s3.metaVal}>{formatDate(invoice.due_date)}</Text>
            </View>
          )}
        </View>

        <View style={s3.cli}>
          <Text style={s3.lbl}>{t.invoiceDoc.to}</Text>
          <Text style={s3.cliName}>{client.name}</Text>
          {showContact && <Text style={s3.cliLine}>{client.contact_name}</Text>}
          {client.address && <Text style={s3.cliLine}>{client.address}</Text>}
          {(client.postal_code || client.city) && <Text style={s3.cliLine}>{[client.postal_code, client.city].filter(Boolean).join(" ")}</Text>}
        </View>

        {invoice.notes && <Text style={s3.notesBody}>{invoice.notes}</Text>}

        <View style={s3.tbl}>
          <View style={s3.thead}>
            <Text style={[s3.th, s3.cDesc]}>{t.invoiceDoc.description}</Text>
            <Text style={[s3.th, s3.cQty]}>{t.invoiceDoc.quantity}</Text>
            <Text style={[s3.th, s3.cRate]}>{t.invoiceDoc.rate}</Text>
            <Text style={[s3.th, s3.cAmt]}>{t.invoiceDoc.amount}</Text>
          </View>
          {lines.map((l) => (
            <View style={s3.tr} key={l.id}>
              <Text style={[s3.td, s3.cDesc]}>{l.description}</Text>
              <Text style={[s3.tdGrey, s3.cQty]}>{l.quantity} {unitLabel(l.unit)}</Text>
              <Text style={[s3.tdGrey, s3.cRate]}>{formatCurrency(l.rate)}</Text>
              <Text style={[s3.tdBold, s3.cAmt]}>{formatCurrency(l.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={s3.totWrap}>
          <View style={s3.totBlock}>
            <View style={s3.totRow}><Text style={s3.totLbl}>{t.invoiceDoc.subtotalExVat}</Text><Text style={s3.totVal}>{formatCurrency(invoice.subtotal_ex_vat)}</Text></View>
            <View style={s3.totRow}><Text style={s3.totLbl}>{t.invoiceDoc.vat} {invoice.vat_rate ?? 21}%</Text><Text style={s3.totVal}>{formatCurrency(invoice.vat_amount)}</Text></View>
            <View style={s3.totFinal}><Text style={s3.totFLbl}>{t.invoiceDoc.total}</Text><Text style={s3.totFVal}>{formatCurrency(invoice.total_inc_vat)}</Text></View>
          </View>
        </View>

        <View style={s3.foot}>
          <View style={s3.footLeft}>
            <Text style={s3.footName}>{profile.studio_name || profile.full_name}</Text>
            {profile.address && <Text style={s3.footAddr}>{profile.address}, {[profile.postal_code, profile.city].filter(Boolean).join(" ")}</Text>}
          </View>
          <View style={s3.footRight}>
            {profile.iban && <View><Text style={s3.footLbl}>IBAN</Text><Text style={s3.footVal}>{profile.iban}</Text></View>}
            {profile.bic && <View><Text style={s3.footLbl}>BIC</Text><Text style={s3.footVal}>{profile.bic}</Text></View>}
            <View><Text style={s3.footLbl}>{t.invoiceDoc.paymentTerms}</Text><Text style={s3.footVal}>{days} {t.invoiceDoc.daysNet}</Text></View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEMPLATE 4: POSTER — Massive VAT100 logo, clean layout
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const INK4 = "#000000";
const M4 = 44;

const s4 = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: M4 + 28, paddingLeft: M4, paddingRight: M4, fontFamily: "Helvetica", color: INK4, backgroundColor: "#FFFFFF" },
  // Logo — massive, full-width dominant
  logo: { fontSize: 130, fontWeight: 700, letterSpacing: -5.2, lineHeight: 0.82, marginBottom: 28 },
  // Sender + meta row
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  senderBlock: {},
  senderName: { fontSize: 12, fontWeight: 700, marginBottom: 6 },
  senderLine: { fontSize: 10, color: INK4, lineHeight: 1.65 },
  metaBlock: { textAlign: "right" },
  metaRow: { flexDirection: "row", justifyContent: "flex-end", gap: 20, marginBottom: 2 },
  metaLabel: { fontSize: 10, color: INK4 },
  metaValue: { fontSize: 10, color: INK4, fontWeight: 700, width: 80, textAlign: "right" },
  // Recipient
  recipientWrap: { marginTop: 40, marginBottom: 8 },
  recipientLabel: { fontSize: 10, color: INK4, marginBottom: 4 },
  recipientLine: { fontSize: 10, color: INK4, lineHeight: 1.65 },
  // Notes / Object
  notesWrap: { marginTop: 24, marginBottom: 8 },
  notesLabel: { fontSize: 10, color: INK4, marginBottom: 4 },
  notesBody: { fontSize: 10, color: INK4, lineHeight: 1.65 },
  // Table
  tbl: { marginTop: 28 },
  thead: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: INK4, paddingBottom: 6 },
  th: { fontSize: 10, color: INK4 },
  tr: { flexDirection: "row", paddingVertical: 7 },
  td: { fontSize: 10, color: INK4 },
  cDesc: { width: "44%" },
  cQty: { width: "16%" },
  cRate: { width: "20%", textAlign: "right" },
  cAmt: { width: "20%", textAlign: "right" },
  // Totals row — separated by top border
  totRow: { flexDirection: "row", paddingVertical: 7, borderTopWidth: 0.5, borderTopColor: INK4 },
  totLabel: { fontSize: 10, color: INK4 },
  totVal: { fontSize: 10, color: INK4 },
  // Footer
  foot: { position: "absolute", bottom: M4 - 8, left: M4, right: M4 },
  footLine: { fontSize: 6.5, color: INK4, lineHeight: 1.6 },
  footRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  footCompany: { fontSize: 6.5, color: INK4 },
});

function PosterPDF({ data, locale }: { data: InvoiceData; locale: Locale }) {
  const t = getDictionary(locale);
  const { invoice, lines, client, profile } = data;
  const days = calculatePaymentDays({ issueDate: invoice.issue_date, dueDate: invoice.due_date, defaultDays: 30 });
  const showContact = client.contact_name && client.contact_name.toLowerCase() !== client.name.toLowerCase();

  return (
    <Document>
      <Page size="A4" style={s4.page}>
        {/* VAT100 — massive poster logo */}
        <Text style={s4.logo}>VAT100</Text>

        {/* Sender left + Meta right */}
        <View style={s4.infoRow}>
          <View style={s4.senderBlock}>
            <Text style={s4.senderName}>{profile.studio_name || profile.full_name}</Text>
            {profile.kvk_number && <Text style={s4.senderLine}>KVK {profile.kvk_number}</Text>}
            {profile.btw_number && <Text style={s4.senderLine}>BTW {profile.btw_number}</Text>}
            {profile.address && <Text style={s4.senderLine}>{profile.address}</Text>}
            {(profile.postal_code || profile.city) && <Text style={s4.senderLine}>{[profile.postal_code, profile.city].filter(Boolean).join(" ")}</Text>}
          </View>
          <View style={s4.metaBlock}>
            <View style={s4.metaRow}>
              <Text style={s4.metaLabel}>{t.invoiceDoc.invoiceNumber}</Text>
              <Text style={s4.metaValue}>{invoice.invoice_number}</Text>
            </View>
            <View style={s4.metaRow}>
              <Text style={s4.metaLabel}>{t.invoiceDoc.date}</Text>
              <Text style={s4.metaValue}>{formatDate(invoice.issue_date)}</Text>
            </View>
            {invoice.due_date && (
              <View style={s4.metaRow}>
                <Text style={s4.metaLabel}>{t.invoiceDoc.dueDate}</Text>
                <Text style={s4.metaValue}>{formatDate(invoice.due_date)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Recipient */}
        <View style={s4.recipientWrap}>
          <Text style={s4.recipientLabel}>{t.invoiceDoc.to} :</Text>
          <Text style={[s4.recipientLine, { fontWeight: 700 }]}>{client.name}</Text>
          {showContact && <Text style={s4.recipientLine}>{client.contact_name}</Text>}
          {client.address && <Text style={s4.recipientLine}>{client.address}</Text>}
          {(client.postal_code || client.city) && <Text style={s4.recipientLine}>{[client.postal_code, client.city].filter(Boolean).join(" ")}</Text>}
          {client.kvk_number && <Text style={s4.recipientLine}>KVK {client.kvk_number}</Text>}
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={s4.notesWrap}>
            <Text style={s4.notesLabel}>{t.invoiceDoc.description} :</Text>
            <Text style={s4.notesBody}>{invoice.notes}</Text>
          </View>
        )}

        {/* Table — minimal, only header and total borders */}
        <View style={s4.tbl}>
          <View style={s4.thead}>
            <Text style={[s4.th, s4.cDesc]}></Text>
            <Text style={[s4.th, s4.cQty]}></Text>
            <Text style={[s4.th, s4.cRate]}>{t.invoiceDoc.rate}</Text>
            <Text style={[s4.th, s4.cAmt]}>{t.invoiceDoc.amount}</Text>
          </View>
          {lines.map((l) => (
            <View style={s4.tr} key={l.id}>
              <Text style={[s4.td, s4.cDesc]}>{l.description}</Text>
              <Text style={[s4.td, s4.cQty]}>{l.quantity} {unitLabel(l.unit)}</Text>
              <Text style={[s4.td, s4.cRate]}>{formatCurrency(l.rate)}</Text>
              <Text style={[s4.td, s4.cAmt]}>{formatCurrency(l.amount)}</Text>
            </View>
          ))}
          {/* Subtotal */}
          <View style={s4.totRow}>
            <Text style={[s4.totLabel, s4.cDesc]}>{t.invoiceDoc.subtotalExVat}</Text>
            <Text style={[s4.totVal, s4.cQty]}></Text>
            <Text style={[s4.totVal, s4.cRate]}></Text>
            <Text style={[s4.totVal, s4.cAmt]}>{formatCurrency(invoice.subtotal_ex_vat)}</Text>
          </View>
          {/* BTW */}
          <View style={s4.tr}>
            <Text style={[s4.td, s4.cDesc]}>{t.invoiceDoc.vat} {invoice.vat_rate ?? 21}%</Text>
            <Text style={[s4.td, s4.cQty]}></Text>
            <Text style={[s4.td, s4.cRate]}></Text>
            <Text style={[s4.td, s4.cAmt]}>{formatCurrency(invoice.vat_amount)}</Text>
          </View>
          {/* Total */}
          <View style={[s4.totRow, { borderTopWidth: 1 }]}>
            <Text style={[s4.totLabel, s4.cDesc, { fontWeight: 700 }]}>{t.invoiceDoc.total}</Text>
            <Text style={[s4.totVal, s4.cQty]}></Text>
            <Text style={[s4.totVal, s4.cRate]}></Text>
            <Text style={[s4.totVal, s4.cAmt, { fontWeight: 700 }]}>{formatCurrency(invoice.total_inc_vat)}</Text>
          </View>
        </View>

        {/* Footer — small legal text */}
        <View style={s4.foot}>
          {profile.iban && <Text style={s4.footLine}>IBAN {profile.iban}{profile.bic ? `  BIC ${profile.bic}` : ""}</Text>}
          <Text style={s4.footLine}>{t.invoiceDoc.paymentTerms}: {days} {t.invoiceDoc.daysNet}</Text>
          <View style={s4.footRow}>
            <Text style={s4.footCompany}></Text>
            <Text style={s4.footCompany}>{profile.studio_name || profile.full_name}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
