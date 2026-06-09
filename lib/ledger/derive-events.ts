/**
 * Event-deriver — de brug van "tabellen" naar "gebeurtenisstroom" (routekaart
 * stap 2, zie docs/revolutie-architectuur.md).
 *
 * Zolang de tabellen nog de bron zijn, leiden we de gebeurtenisstroom hieruit
 * af. Een reconciliatie-test bewijst dat de projectie van die stroom exact
 * overeenkomt met de canonieke berekeningen (`calculateBtwRubrieken`). Pas als
 * dat aantoonbaar klopt, mogen de projecties de waarheid worden en de tabellen
 * caches. Geen big-bang, wel bewezen.
 *
 * Puur: geen DB/IO. De server verzamelt de rijen; deze module mapt ze.
 */

import type { FiscalEvent } from "./fiscal-events";

export interface DerivableInvoice {
  id: string;
  issue_date: string;
  subtotal_ex_vat: number;
  vat_amount: number;
}

export interface DerivableReceipt {
  id: string;
  receipt_date: string | null;
  amount_ex_vat: number | null;
  vat_amount: number | null;
  business_percentage?: number | null;
}

export interface DerivablePayment {
  invoice_id: string;
  amount: number;
  date: string;
}

export interface DerivableTaxPayment {
  kind: "btw" | "ib";
  amount: number;
  date: string;
}

export interface DerivableData {
  invoices?: DerivableInvoice[];
  receipts?: DerivableReceipt[];
  payments?: DerivablePayment[];
  taxPayments?: DerivableTaxPayment[];
}

/**
 * Leidt een gebeurtenisstroom af uit de huidige tabellen. De volgorde is
 * chronologisch genoeg voor de projectie (die commutatief vouwt); `at` draagt
 * de echte datum voor tijdreizen.
 */
export function deriveFiscalEvents(data: DerivableData): FiscalEvent[] {
  const events: FiscalEvent[] = [];

  for (const inv of data.invoices ?? []) {
    events.push({
      type: "invoice.issued",
      at: inv.issue_date,
      invoiceId: inv.id,
      netExVat: Number(inv.subtotal_ex_vat) || 0,
      vat: Number(inv.vat_amount) || 0,
    });
  }

  for (const rec of data.receipts ?? []) {
    if (!rec.receipt_date) continue;
    events.push({
      type: "expense.captured",
      at: rec.receipt_date,
      expenseId: rec.id,
      netExVat: Number(rec.amount_ex_vat) || 0,
      vat: Number(rec.vat_amount) || 0,
      businessPct: rec.business_percentage ?? 100,
    });
  }

  for (const pay of data.payments ?? []) {
    events.push({
      type: "payment.received",
      at: pay.date,
      invoiceId: pay.invoice_id,
      amount: Number(pay.amount) || 0,
    });
  }

  for (const tax of data.taxPayments ?? []) {
    events.push({
      type: "tax.paid",
      at: tax.date,
      taxKind: tax.kind,
      amount: Number(tax.amount) || 0,
    });
  }

  return events;
}
