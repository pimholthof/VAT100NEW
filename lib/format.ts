// ─── Re-exports from canonical calculation module ───
export {
  type InvoiceTotals as VatTotals,
  calculateInvoiceTotals as calculateLineTotals,
  calculateInvoiceVatAmount,
  roundMoney,
} from "./logic/invoice-calculations";

import {
  calculateInvoiceVatAmount,
  roundMoney,
  type InvoiceTotals,
} from "./logic/invoice-calculations";
import type { VatRate } from "./types";

/**
 * Calculates VAT totals from a subtotal (ex VAT) and a rate.
 * Used by receipts. Wraps the canonical invoice calculation.
 */
export function calculateVat(subtotalExVat: number, vatRate: VatRate): InvoiceTotals {
  const rounded = roundMoney(subtotalExVat);
  const vatAmount = calculateInvoiceVatAmount(rounded, vatRate);
  return {
    subtotalExVat: rounded,
    vatAmount,
    totalIncVat: roundMoney(rounded + vatAmount),
  };
}

// ─── Shared formatting utilities ───

/**
 * Escapes HTML special characters to prevent XSS in email templates.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Formatting ───

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/**
 * Short date format for tables: "05-03-2026"
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Long date format for emails/documents: "5 maart 2026"
 */
export function formatDateLong(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
