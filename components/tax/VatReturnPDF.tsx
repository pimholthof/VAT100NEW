import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { QuarterStats } from "@/lib/actions/tax";

const COLOR = "#0D0D0B";
const MARGIN = 56;

const LABEL = {
  fontSize: 9,
  letterSpacing: 0.02 * 9,
  color: "rgba(13,13,11,0.5)",
  fontFamily: "Helvetica",
  fontWeight: 400 as const,
};

const VALUE = {
  fontSize: 11,
  fontFamily: "Courier",
  fontWeight: 400 as const,
  color: COLOR,
};

const s = StyleSheet.create({
  page: {
    width: 595,
    height: 842,
    paddingTop: MARGIN,
    paddingBottom: MARGIN,
    paddingHorizontal: MARGIN,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: COLOR,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 11,
    color: "rgba(13,13,11,0.5)",
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: COLOR,
    marginBottom: 12,
    marginTop: 24,
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR,
    borderBottomStyle: "solid" as const,
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(13,13,11,0.06)",
    borderBottomStyle: "solid" as const,
  },
  totalRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: COLOR,
    borderTopStyle: "solid" as const,
    marginTop: 4,
  },
  label: LABEL,
  value: VALUE,
  profileSection: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(13,13,11,0.15)",
    borderBottomStyle: "solid" as const,
  },
  profileLine: {
    fontSize: 10,
    color: COLOR,
    marginBottom: 2,
  },
  disclaimer: {
    fontSize: 8,
    color: "rgba(13,13,11,0.4)",
    marginTop: 40,
    lineHeight: 1.5,
  },
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

interface Props {
  quarter: QuarterStats;
  profile: {
    full_name: string;
    studio_name: string | null;
    btw_number: string | null;
    kvk_number: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
  };
  invoices: {
    invoice_number: string;
    issue_date: string;
    client_name: string;
    subtotal_ex_vat: number;
    vat_amount: number;
  }[];
  receipts: {
    vendor_name: string | null;
    receipt_date: string | null;
    amount_ex_vat: number;
    vat_amount: number;
  }[];
}

export function VatReturnPDF({ quarter, profile, invoices, receipts }: Props) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Title */}
        <Text style={s.title}>BTW-overzicht</Text>
        <Text style={s.subtitle}>{quarter.quarter}</Text>

        {/* Business details */}
        <View style={s.profileSection}>
          {profile.studio_name && (
            <Text style={s.profileLine}>{profile.studio_name}</Text>
          )}
          <Text style={s.profileLine}>{profile.full_name}</Text>
          {profile.address && (
            <Text style={s.profileLine}>
              {profile.address}
              {profile.postal_code ? `, ${profile.postal_code}` : ""}
              {profile.city ? ` ${profile.city}` : ""}
            </Text>
          )}
          {profile.btw_number && (
            <Text style={s.profileLine}>BTW: {profile.btw_number}</Text>
          )}
          {profile.kvk_number && (
            <Text style={s.profileLine}>KvK: {profile.kvk_number}</Text>
          )}
        </View>

        {/* Summary */}
        <Text style={s.sectionTitle}>Samenvatting</Text>
        <View style={s.row}>
          <Text style={s.label}>Omzet excl. BTW</Text>
          <Text style={s.value}>{formatCurrency(quarter.revenueExVat)}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>BTW over omzet (output)</Text>
          <Text style={s.value}>{formatCurrency(quarter.outputVat)}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Aftrekbare BTW (input)</Text>
          <Text style={s.value}>{formatCurrency(quarter.inputVat)}</Text>
        </View>
        <View style={s.totalRow}>
          <Text style={{ ...s.label, fontWeight: 700, color: COLOR }}>
            {quarter.netVat >= 0 ? "Te betalen BTW" : "Te vorderen BTW"}
          </Text>
          <Text style={{ ...s.value, fontWeight: 700 }}>
            {formatCurrency(Math.abs(quarter.netVat))}
          </Text>
        </View>

        {/* Invoices */}
        {invoices.length > 0 && (
          <>
            <Text style={s.sectionTitle}>
              Facturen ({invoices.length})
            </Text>
            {invoices.map((inv, i) => (
              <View key={i} style={s.row}>
                <Text style={{ ...s.value, width: 70 }}>{inv.invoice_number}</Text>
                <Text style={{ ...s.value, flex: 1 }}>{inv.client_name}</Text>
                <Text style={{ ...s.value, width: 80, textAlign: "right" }}>
                  {formatCurrency(inv.subtotal_ex_vat)}
                </Text>
                <Text style={{ ...s.value, width: 70, textAlign: "right" }}>
                  {formatCurrency(inv.vat_amount)}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Receipts */}
        {receipts.length > 0 && (
          <>
            <Text style={s.sectionTitle}>
              Bonnen ({receipts.length})
            </Text>
            {receipts.map((rec, i) => (
              <View key={i} style={s.row}>
                <Text style={{ ...s.value, flex: 1 }}>
                  {rec.vendor_name ?? "—"}
                </Text>
                <Text style={{ ...s.value, width: 80, textAlign: "right" }}>
                  {formatCurrency(rec.amount_ex_vat)}
                </Text>
                <Text style={{ ...s.value, width: 70, textAlign: "right" }}>
                  {formatCurrency(rec.vat_amount)}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Disclaimer */}
        <Text style={s.disclaimer}>
          Dit document is indicatief en vervangt niet je officiële BTW-aangifte.
          Dien je aangifte in via het portaal van de Belastingdienst.
          Gegenereerd op {new Date().toLocaleDateString("nl-NL")}.
        </Text>
      </Page>
    </Document>
  );
}
