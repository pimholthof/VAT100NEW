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
 */
export function calculateLineTotals(
  lines: { quantity: number; rate: number }[],
  vatRate: number
): VatTotals {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.quantity * line.rate,
    0
  );
  return calculateVat(subtotal, vatRate);
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
