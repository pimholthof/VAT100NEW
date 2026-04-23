import type { InvoiceLineInput } from "@/lib/types";
import { todayIso, daysFromTodayIso } from "@/lib/utils/date-helpers";

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
 * @deprecated Use `todayIso` from @/lib/utils/date-helpers directly.
 */
export function today(): string {
  return todayIso();
}

/**
 * Returns a date 30 days from now as YYYY-MM-DD string.
 * @deprecated Use `daysFromTodayIso(30)` from @/lib/utils/date-helpers directly.
 */
export function in30Days(): string {
  return daysFromTodayIso(30);
}
