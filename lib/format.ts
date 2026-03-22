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

// ─── VAT calculation ───

export interface VatTotals {
  subtotalExVat: number;
  vatAmount: number;
  totalIncVat: number;
}

/**
 * Calculates VAT totals from a subtotal (ex VAT) and a rate.
 * Used by invoices (from line items) and receipts.
 */
export function calculateVat(subtotalExVat: number, vatRate: number): VatTotals {
  const rounded = Math.round(subtotalExVat * 100) / 100;
  const vatAmount = Math.round(rounded * (vatRate / 100) * 100) / 100;
  return {
    subtotalExVat: rounded,
    vatAmount,
    totalIncVat: Math.round((rounded + vatAmount) * 100) / 100,
  };
}

/**
 * Calculates VAT totals from invoice line items.
 * Supports per-line VAT rates. Falls back to the invoice-level vatRate
 * if a line has no vat_rate property.
 */
export function calculateLineTotals(
  lines: { quantity: number; rate: number; vat_rate?: number }[],
  vatRate: number
): VatTotals {
  let subtotal = 0;
  let totalVat = 0;

  for (const line of lines) {
    const lineAmount = Math.round(line.quantity * line.rate * 100) / 100;
    const lineVatRate = line.vat_rate ?? vatRate;
    const lineVat = Math.round(lineAmount * (lineVatRate / 100) * 100) / 100;
    subtotal += lineAmount;
    totalVat += lineVat;
  }

  subtotal = Math.round(subtotal * 100) / 100;
  totalVat = Math.round(totalVat * 100) / 100;

  return {
    subtotalExVat: subtotal,
    vatAmount: totalVat,
    totalIncVat: Math.round((subtotal + totalVat) * 100) / 100,
  };
}

// ─── Formatting ───

export function formatCurrency(amount: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
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
