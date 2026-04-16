/**
 * Accountant-ready CSV export (memoriaal-/grootboekformaat).
 *
 * Compatibel met Twinfield, Exact Online en Snelstart via de
 * generieke "boekstukregel"-kolomstructuur die alle drie ondersteunen.
 *
 * Kolommen zijn Nederlandstalig, bedragen in EUR met punt als
 * decimaalteken (internationale CSV-conventie — Twinfield/Exact
 * verwachten dit, ook al is het geen NL-komma).
 */

export type VatCode = "NL_21" | "NL_9" | "NL_0" | "NL_VRIJ" | "NL_VERLEGD_EU" | "NL_EXPORT";

export interface AccountantInvoiceRow {
  invoice_number: string;
  issue_date: string | null; // YYYY-MM-DD
  client_name: string;
  description: string;
  subtotal_ex_vat: number;
  vat_amount: number;
  total_inc_vat: number;
  vat_rate: number;
  vat_scheme: string | null;
  status: string | null;
}

export interface AccountantReceiptRow {
  receipt_date: string | null;
  vendor_name: string;
  description: string;
  subtotal_ex_vat: number;
  vat_amount: number;
  total_inc_vat: number;
  vat_rate: number;
  business_percentage: number;
  cost_code: number | null;
  cost_code_name: string | null;
}

export const ACCOUNT_DEBTORS = 1100; // Debiteuren
export const ACCOUNT_CREDITORS = 2000; // Crediteuren
export const ACCOUNT_VAT_PAYABLE = 2100; // BTW te betalen (verkoop)
export const ACCOUNT_VAT_RECEIVABLE = 1300; // BTW te vorderen (inkoop)

function vatCodeFor(rate: number, scheme: string | null): VatCode {
  if (scheme === "eu_reverse_charge") return "NL_VERLEGD_EU";
  if (scheme === "export_outside_eu") return "NL_EXPORT";
  if (rate === 21) return "NL_21";
  if (rate === 9) return "NL_9";
  if (rate === 0) return "NL_0";
  return "NL_VRIJ";
}

function revenueAccountFor(scheme: string | null): number {
  if (scheme === "eu_reverse_charge") return 8200;
  if (scheme === "export_outside_eu") return 8300;
  return 8000;
}

function num(v: number): string {
  return (Math.round(v * 100) / 100).toFixed(2);
}

export const ACCOUNTANT_INVOICE_HEADERS = [
  "Datum",
  "Boekstuknr",
  "Relatie",
  "Omschrijving",
  "Grootboek",
  "Tegenrekening",
  "BTW-code",
  "BTW-percentage",
  "Bedrag excl. BTW",
  "BTW-bedrag",
  "Bedrag incl. BTW",
  "Status",
];

export function buildInvoiceRows(
  invoices: AccountantInvoiceRow[]
): string[][] {
  return invoices.map((inv) => [
    inv.issue_date ?? "",
    inv.invoice_number,
    inv.client_name,
    inv.description || `Factuur ${inv.invoice_number}`,
    String(revenueAccountFor(inv.vat_scheme)),
    String(ACCOUNT_DEBTORS),
    vatCodeFor(inv.vat_rate, inv.vat_scheme),
    `${inv.vat_rate}%`,
    num(inv.subtotal_ex_vat),
    num(inv.vat_amount),
    num(inv.total_inc_vat),
    inv.status ?? "",
  ]);
}

export const ACCOUNTANT_RECEIPT_HEADERS = [
  "Datum",
  "Leverancier",
  "Omschrijving",
  "Grootboek",
  "Grootboek-naam",
  "Tegenrekening",
  "BTW-code",
  "BTW-percentage",
  "Zakelijk %",
  "Bedrag excl. BTW (zakelijk)",
  "BTW-bedrag (zakelijk)",
  "Bedrag incl. BTW",
];

export function buildReceiptRows(
  receipts: AccountantReceiptRow[]
): string[][] {
  return receipts.map((r) => {
    const pct = Math.max(0, Math.min(100, r.business_percentage ?? 100)) / 100;
    const businessEx = r.subtotal_ex_vat * pct;
    const businessVat = r.vat_amount * pct;
    return [
      r.receipt_date ?? "",
      r.vendor_name,
      r.description || r.cost_code_name || "Bon",
      r.cost_code != null ? String(r.cost_code) : "4999",
      r.cost_code_name ?? "Overige kosten",
      String(ACCOUNT_CREDITORS),
      vatCodeFor(r.vat_rate, null),
      `${r.vat_rate}%`,
      `${Math.round(r.business_percentage ?? 100)}%`,
      num(businessEx),
      num(businessVat),
      num(r.total_inc_vat),
    ];
  });
}
