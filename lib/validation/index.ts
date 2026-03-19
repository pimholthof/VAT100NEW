import { z } from "zod";

// ─── Shared ───

const trimmedString = z.string().trim();
const optionalString = trimmedString.nullable().optional();

// ─── Client ───

export const clientSchema = z.object({
  name: trimmedString.min(1, "Naam is verplicht"),
  contact_name: optionalString,
  email: optionalString.refine(
    (v) => !v || z.string().email().safeParse(v).success,
    "Ongeldig e-mailadres"
  ),
  address: optionalString,
  city: optionalString,
  postal_code: optionalString,
  kvk_number: optionalString,
  btw_number: optionalString,
});

export type ClientSchema = z.infer<typeof clientSchema>;

// ─── Invoice Line ───

const invoiceLineSchema = z.object({
  id: z.string(),
  description: trimmedString.min(1, "Omschrijving is verplicht"),
  quantity: z.number().positive("Aantal moet positief zijn"),
  unit: z.enum(["uren", "dagen", "stuks"]),
  rate: z.number().min(0, "Tarief mag niet negatief zijn"),
});

// ─── Invoice ───

export const invoiceSchema = z.object({
  client_id: z.string().min(1, "Klant is verplicht"),
  invoice_number: trimmedString.min(1, "Factuurnummer is verplicht"),
  status: z.enum(["draft", "sent", "paid", "overdue"]),
  issue_date: z.string().min(1, "Factuurdatum is verplicht"),
  due_date: z.string().nullable(),
  vat_rate: z.union([z.literal(0), z.literal(9), z.literal(21)]),
  notes: optionalString,
  lines: z
    .array(invoiceLineSchema)
    .min(1, "Minimaal één factuurregel is verplicht"),
});

export type InvoiceSchema = z.infer<typeof invoiceSchema>;

// ─── Receipt ───

export const receiptSchema = z.object({
  vendor_name: optionalString,
  amount_ex_vat: z.number().min(0).nullable().optional(),
  vat_rate: z.union([z.literal(0), z.literal(9), z.literal(21)]).nullable().optional(),
  category: optionalString,
  cost_code: z.number().nullable().optional(),
  receipt_date: z.string().nullable().optional(),
});

export type ReceiptSchema = z.infer<typeof receiptSchema>;

// ─── Profile ───

export const profileSchema = z.object({
  full_name: trimmedString.min(1, "Naam is verplicht"),
  studio_name: optionalString,
  kvk_number: optionalString,
  btw_number: optionalString,
  address: optionalString,
  city: optionalString,
  postal_code: optionalString,
  iban: optionalString,
  bic: optionalString,
});

export type ProfileSchema = z.infer<typeof profileSchema>;

// ─── Helpers ───

export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { error: string | null; data?: T } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.issues[0];
    return { error: firstError?.message ?? "Validatiefout" };
  }
  return { error: null, data: result.data };
}
