// ─── Shared PDF layout helpers for annual account ───

import { StyleSheet } from "@react-pdf/renderer";

export const MARGIN = 60;
export const COLOR = "#0A0A0A";
export const COLOR_MUTED = "#6B6B6B";

// ─── Currency formatting (Dutch style: € 1.234) ───

export function formatEuro(amount: number): string {
  if (amount === 0) return "—";
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("nl-NL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const sign = amount < 0 ? "-/- " : "";
  return `${sign}€ ${formatted}`;
}

export function formatEuroSigned(amount: number): string {
  if (amount === 0) return "—";
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("nl-NL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  if (amount < 0) return `-/- € ${formatted}`;
  return `€ ${formatted}`;
}

export function formatPercentage(rate: number): string {
  return `${rate.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

// ─── Shared styles ───

export const baseStyles = StyleSheet.create({
  page: {
    width: 595,
    height: 842,
    paddingTop: MARGIN,
    paddingBottom: MARGIN + 20,
    paddingLeft: MARGIN,
    paddingRight: MARGIN,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: COLOR,
    backgroundColor: "#FFFFFF",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: MARGIN - 10,
    left: MARGIN,
    right: MARGIN,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: COLOR_MUTED,
  },

  // Section header
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 16,
    marginTop: 8,
  },

  subHeader: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    marginTop: 12,
  },

  // Table structures
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
  },

  tableRowBorder: {
    flexDirection: "row",
    paddingVertical: 3,
    borderTopWidth: 0.3,
    borderTopColor: COLOR,
  },

  tableRowDoubleBorder: {
    flexDirection: "row",
    paddingVertical: 3,
    borderTopWidth: 0.5,
    borderTopColor: COLOR,
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR,
    marginTop: 1,
  },

  // Column styles
  colLabel: {
    flex: 1,
    fontSize: 9,
  },

  colLabelIndent: {
    flex: 1,
    fontSize: 9,
    paddingLeft: 16,
  },

  colAmount: {
    width: 80,
    textAlign: "right",
    fontSize: 9,
    fontFamily: "Helvetica",
  },

  colAmountWide: {
    width: 100,
    textAlign: "right",
    fontSize: 9,
    fontFamily: "Helvetica",
  },

  colRef: {
    width: 30,
    textAlign: "right",
    fontSize: 8,
    color: COLOR_MUTED,
  },

  // Two-year comparison columns
  colYear: {
    width: 80,
    textAlign: "right",
    fontSize: 9,
    fontFamily: "Helvetica",
  },

  colYearHeader: {
    width: 80,
    textAlign: "right",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },

  // Bold text
  bold: {
    fontFamily: "Helvetica-Bold",
  },

  // Muted text
  muted: {
    color: COLOR_MUTED,
  },

  // Spacing
  spacer: {
    height: 16,
  },

  spacerSmall: {
    height: 8,
  },

  // Body text
  bodyText: {
    fontSize: 9,
    lineHeight: 1.6,
    marginBottom: 8,
  },

  // Cover page styles
  coverContainer: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 80,
  },

  coverLabel: {
    fontSize: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: COLOR_MUTED,
    marginBottom: 4,
  },

  coverTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },

  coverSubtitle: {
    fontSize: 14,
    color: COLOR_MUTED,
    marginBottom: 24,
  },

  coverMeta: {
    fontSize: 9,
    color: COLOR_MUTED,
    marginBottom: 2,
  },

  // TOC styles
  tocRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 0.25,
    borderBottomColor: "#E0E0E0",
  },

  tocLabel: {
    fontSize: 10,
  },

  tocPage: {
    fontSize: 10,
    fontFamily: "Helvetica",
    color: COLOR_MUTED,
  },

  // Horizontal rule
  hr: {
    borderBottomWidth: 0.3,
    borderBottomColor: COLOR,
    marginVertical: 4,
  },

  hrDouble: {
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR,
    marginVertical: 2,
  },
});

// ─── Category label mapping ───

export const CATEGORY_LABELS_NL: Record<string, string> = {
  materiaal: "Materiaalkosten",
  gereedschap: "Gereedschapskosten",
  huur: "Huisvestingskosten",
  administratie: "Administratiekosten",
  transport: "Vervoerskosten",
  overig: "Overige kosten",
  bankkosten: "Bankkosten",
};

export const CATEGORY_LABELS_EN: Record<string, string> = {
  materiaal: "Material costs",
  gereedschap: "Equipment costs",
  huur: "Housing costs",
  administratie: "Administrative costs",
  transport: "Transport costs",
  overig: "Other costs",
  bankkosten: "Bank charges",
};
