import type { InvoiceLineInput, VatRate } from "@/lib/types";
import { MS_PER_DAY } from "@/lib/constants/time";

export type MoneyAmount = number;

export interface InvoiceTotals {
  subtotalExVat: MoneyAmount;
  vatAmount: MoneyAmount;
  totalIncVat: MoneyAmount;
}

export function roundMoney(value: number): MoneyAmount {
  return Math.round(value * 100) / 100;
}

export function calculateInvoiceLineAmount(line: Pick<InvoiceLineInput, "quantity" | "rate">): MoneyAmount {
  return roundMoney(line.quantity * line.rate);
}

// Invoersanitatie voor aantal/tarief-velden: nooit negatief, maximaal
// 2 decimalen. Creditfacturen krijgen hun minteken server-side, niet via
// deze invoervelden.
export function sanitizeQuantity(raw: string): number {
  const parsed = parseFloat(raw);
  if (!Number.isFinite(parsed)) return 0;
  return roundMoney(Math.max(0, parsed));
}

export function sanitizeRate(raw: string): number {
  const parsed = parseFloat(raw);
  if (!Number.isFinite(parsed)) return 0;
  return roundMoney(Math.max(0, parsed));
}

// Afrondingsstrategie: elke regel wordt eerst op de cent afgerond (zoals de
// regel ook getoond wordt), daarna sommeren we de afgeronde regelbedragen.
// Zo telt wat op het scherm staat altijd exact op tot het subtotaal. De
// buitenste roundMoney vangt alleen IEEE-754-artefacten in de som af.
export function calculateInvoiceSubtotalExVat(lines: Array<Pick<InvoiceLineInput, "quantity" | "rate">>): MoneyAmount {
  return roundMoney(
    lines.reduce((sum, line) => sum + calculateInvoiceLineAmount(line), 0)
  );
}

export function calculateInvoiceVatAmount(subtotalExVat: number, vatRate: VatRate): MoneyAmount {
  return roundMoney(roundMoney(subtotalExVat) * (vatRate / 100));
}

export function calculateInvoiceTotalIncVat(subtotalExVat: number, vatAmount: number): MoneyAmount {
  return roundMoney(roundMoney(subtotalExVat) + roundMoney(vatAmount));
}

export function calculateInvoiceTotals(
  lines: Array<Pick<InvoiceLineInput, "quantity" | "rate">>,
  vatRate: VatRate
): InvoiceTotals {
  const subtotalExVat = calculateInvoiceSubtotalExVat(lines);
  const vatAmount = calculateInvoiceVatAmount(subtotalExVat, vatRate);
  const totalIncVat = calculateInvoiceTotalIncVat(subtotalExVat, vatAmount);
  return { subtotalExVat, vatAmount, totalIncVat };
}

export function calculatePaymentDays(params: {
  issueDate: string;
  dueDate: string | null;
  defaultDays?: number;
}): number {
  const { issueDate, dueDate, defaultDays = 30 } = params;
  if (!dueDate) return defaultDays;

  const issue = new Date(issueDate).getTime();
  const due = new Date(dueDate).getTime();

  if (Number.isNaN(issue) || Number.isNaN(due)) return defaultDays;

  return Math.max(0, Math.ceil((due - issue) / MS_PER_DAY));
}
