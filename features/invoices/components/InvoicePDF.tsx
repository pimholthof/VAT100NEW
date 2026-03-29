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

// ─── Design tokens ───

const COLOR = "#000000";
const MARGIN = 48;

const LABEL = {
  fontSize: 7.5,
  letterSpacing: 0.12 * 7.5,
  color: "rgba(0,0,0,0.35)",
  fontFamily: "Helvetica",
  fontWeight: 400 as const,
  textTransform: "uppercase" as const,
};

const VALUE = {
  fontSize: 9,
  fontFamily: "Helvetica",
  fontWeight: 400 as const,
  color: COLOR,
  lineHeight: 1.5,
};

const RULE = {
  borderBottomWidth: 0.5,
  borderBottomColor: COLOR,
  borderBottomStyle: "solid" as const,
};

const RULE_THIN = {
  borderBottomWidth: 0.5,
  borderBottomColor: "rgba(0,0,0,0.06)",
  borderBottomStyle: "solid" as const,
};

// ─── Helpers ───

function unitLabel(unit: string): string {
  if (unit === "dagen") return "dagen";
  if (unit === "uren") return "uren";
  return "stuks";
}

// ─── Styles ───

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

  // Header — Massive watermark
  header: {
    marginBottom: 28,
  },
  vat100Mark: {
    fontFamily: "Helvetica",
    fontWeight: 700,
    fontSize: 120,
    letterSpacing: -0.04 * 120,
    color: COLOR,
    opacity: 0.05,
    lineHeight: 0.8,
  },

  // Two-column meta section
  metaGrid: {
    flexDirection: "row",
    marginBottom: 32,
    gap: 32,
  },
  metaLeft: {
    width: "55%",
  },
  metaRight: {
    flex: 1,
  },
  senderName: {
    fontSize: 12,
    fontFamily: "Helvetica",
    fontWeight: 700,
    letterSpacing: -0.01 * 12,
    color: COLOR,
    marginBottom: 6,
  },
  senderDetail: {
    fontSize: 8.5,
    fontFamily: "Helvetica",
    fontWeight: 400,
    color: "rgba(0,0,0,0.45)",
    lineHeight: 1.6,
  },
  docType: {
    ...LABEL,
    fontSize: 8,
    fontWeight: 700 as const,
    letterSpacing: 0.18 * 8,
    color: "rgba(0,0,0,0.35)",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  metaLabel: {
    ...LABEL,
  },
  metaValue: {
    fontSize: 9,
    fontFamily: "Helvetica",
    fontWeight: 400,
    color: COLOR,
  },
  invoiceNumber: {
    fontSize: 16,
    fontFamily: "Helvetica",
    fontWeight: 700,
    letterSpacing: -0.02 * 16,
    color: COLOR,
    marginBottom: 10,
  },

  // Client section
  clientSection: {
    marginBottom: 24,
  },
  clientLabel: {
    ...LABEL,
    marginBottom: 6,
  },
  clientName: {
    fontSize: 11,
    fontFamily: "Helvetica",
    fontWeight: 700,
    color: COLOR,
    marginBottom: 2,
  },
  clientDetail: {
    fontSize: 8.5,
    fontFamily: "Helvetica",
    fontWeight: 400,
    color: "rgba(0,0,0,0.45)",
    lineHeight: 1.6,
  },

  // Notes
  notesSection: {
    marginBottom: 16,
  },
  notesLabel: {
    ...LABEL,
    marginBottom: 4,
  },
  notesText: {
    ...VALUE,
    fontSize: 8.5,
    color: "rgba(0,0,0,0.45)",
  },

  // Table
  tableSection: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    ...RULE,
    paddingVertical: 8,
  },
  tableHeaderCell: {
    ...LABEL,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    ...RULE_THIN,
  },
  tableRowLast: {
    flexDirection: "row",
    paddingVertical: 8,
    ...RULE,
  },
  tableCell: {
    fontSize: 9,
    fontFamily: "Helvetica",
    fontWeight: 400,
    color: COLOR,
    lineHeight: 1.4,
  },

  // Column widths
  colDesc: { width: "50%" },
  colQty: { width: "12%" },
  colRate: { width: "18%", textAlign: "right" },
  colAmount: { width: "20%", textAlign: "right" },

  // Totals
  totalsSection: {
    alignItems: "flex-end",
    marginTop: 16,
  },
  totalsGrid: {
    width: 240,
    alignItems: "flex-end",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 240,
    paddingVertical: 4,
  },
  totalsLabel: {
    ...LABEL,
    color: "rgba(0,0,0,0.35)",
  },
  totalsValue: {
    fontSize: 9,
    fontFamily: "Helvetica",
    fontWeight: 400,
    color: "rgba(0,0,0,0.45)",
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 240,
    paddingVertical: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLOR,
  },
  totalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica",
    fontWeight: 700,
    letterSpacing: 0.12 * 9,
    color: COLOR,
    textTransform: "uppercase",
  },
  totalValue: {
    fontSize: 14,
    fontFamily: "Helvetica",
    fontWeight: 700,
    letterSpacing: -0.02 * 14,
    color: COLOR,
    textAlign: "right",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: MARGIN,
    left: MARGIN,
    right: MARGIN,
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "rgba(0,0,0,0.06)",
    borderTopStyle: "solid",
    paddingTop: 12,
    gap: 40,
  },
  footerCol: {},
  footerLabel: {
    ...LABEL,
    fontSize: 6,
    marginBottom: 3,
  },
  footerValue: {
    fontSize: 8,
    fontFamily: "Helvetica",
    fontWeight: 400,
    color: COLOR,
  },
});

// ─── Component ───

export function InvoicePDF({ data }: { data: InvoiceData }) {
  const { invoice, lines, client, profile } = data;
  const isCreditNote = invoice.is_credit_note;

  const paymentDays = calculatePaymentDays({
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    defaultDays: 30,
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── VAT100 Watermark ── */}
        <View style={s.header}>
          <Text style={s.vat100Mark}>VAT100</Text>
        </View>

        {/* ── Two-column Meta ── */}
        <View style={s.metaGrid}>
          {/* Left: Sender */}
          <View style={s.metaLeft}>
            <Text style={s.senderName}>
              {profile.studio_name || profile.full_name}
            </Text>
            {profile.kvk_number && (
              <Text style={s.senderDetail}>KVK {profile.kvk_number}</Text>
            )}
            {profile.btw_number && (
              <Text style={s.senderDetail}>BTW {profile.btw_number}</Text>
            )}
            {profile.address && (
              <Text style={s.senderDetail}>{profile.address}</Text>
            )}
            {(profile.postal_code || profile.city) && (
              <Text style={s.senderDetail}>
                {[profile.postal_code, profile.city].filter(Boolean).join(" ")}
              </Text>
            )}
          </View>

          {/* Right: Invoice metadata */}
          <View style={s.metaRight}>
            <Text style={s.docType}>
              {isCreditNote ? "CREDITNOTA" : "FACTUUR"}
            </Text>
            <Text style={s.metaLabel}>
              {isCreditNote ? "Creditnotanr" : "Factuurnr"}
            </Text>
            <Text style={s.invoiceNumber}>{invoice.invoice_number}</Text>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Datum</Text>
              <Text style={s.metaValue}>
                {formatDate(invoice.issue_date)}
              </Text>
            </View>
            {invoice.due_date && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Vervaldatum</Text>
                <Text style={s.metaValue}>
                  {formatDate(invoice.due_date)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Client ── */}
        <View style={s.clientSection}>
          <Text style={s.clientLabel}>Aan</Text>
          <Text style={s.clientName}>{client.name}</Text>
          {client.contact_name && (
            <Text style={s.clientDetail}>{client.contact_name}</Text>
          )}
          {client.address && (
            <Text style={s.clientDetail}>{client.address}</Text>
          )}
          {(client.postal_code || client.city) && (
            <Text style={s.clientDetail}>
              {[client.postal_code, client.city].filter(Boolean).join(" ")}
            </Text>
          )}
          {client.kvk_number && (
            <Text style={s.clientDetail}>KVK {client.kvk_number}</Text>
          )}
        </View>

        {/* ── Notes ── */}
        {invoice.notes && (
          <View style={s.notesSection}>
            <Text style={s.notesLabel}>Omschrijving</Text>
            <Text style={s.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* ── Line Items Table ── */}
        <View style={s.tableSection}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, s.colDesc]}>Omschrijving</Text>
            <Text style={[s.tableHeaderCell, s.colQty]}>Aantal</Text>
            <Text style={[s.tableHeaderCell, s.colRate]}>Tarief</Text>
            <Text style={[s.tableHeaderCell, s.colAmount]}>Bedrag</Text>
          </View>

          {lines.map((line, i) => (
            <View
              style={i === lines.length - 1 ? s.tableRowLast : s.tableRow}
              key={line.id}
            >
              <Text style={[s.tableCell, s.colDesc]}>
                {line.description}
              </Text>
              <Text style={[s.tableCell, s.colQty]}>
                {line.quantity} {unitLabel(line.unit)}
              </Text>
              <Text style={[s.tableCell, s.colRate]}>
                {formatCurrency(line.rate)}
              </Text>
              <Text style={[s.tableCell, s.colAmount]}>
                {formatCurrency(line.amount)}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Totals ── */}
        <View style={s.totalsSection}>
          <View style={s.totalsGrid}>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Subtotaal excl. BTW</Text>
              <Text style={s.totalsValue}>
                {formatCurrency(invoice.subtotal_ex_vat)}
              </Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>
                BTW {invoice.vat_rate ?? 21}%
              </Text>
              <Text style={s.totalsValue}>
                {formatCurrency(invoice.vat_amount)}
              </Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Totaal</Text>
              <Text style={s.totalValue}>
                {formatCurrency(invoice.total_inc_vat)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer}>
          {profile.iban && (
            <View style={s.footerCol}>
              <Text style={s.footerLabel}>IBAN</Text>
              <Text style={s.footerValue}>{profile.iban}</Text>
            </View>
          )}
          {profile.bic && (
            <View style={s.footerCol}>
              <Text style={s.footerLabel}>BIC</Text>
              <Text style={s.footerValue}>{profile.bic}</Text>
            </View>
          )}
          <View style={s.footerCol}>
            <Text style={s.footerLabel}>Betaaltermijn</Text>
            <Text style={s.footerValue}>{paymentDays} dagen</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
