import type { InvoiceLineInput } from "@/lib/types";

/**
 * Creates an empty invoice/quote line with default values.
 */
export function createEmptyLine(): InvoiceLineInput {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unit: "uren",
    rate: 0,
  };
}

/**
 * Returns today's date as YYYY-MM-DD string.
 */
export function today(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Returns a date 30 days from now as YYYY-MM-DD string.
 */
export function in30Days(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}
