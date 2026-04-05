import { z } from "zod";

// ─── Shared ───

const trimmedString = z.string().trim();
const optionalString = trimmedString.nullable().optional();
export const uuidSchema = z.string().uuid("Ongeldig ID");

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
  country: optionalString,
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
  vat_scheme: z.enum(["standard", "eu_reverse_charge", "export_outside_eu"]),
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
  vat_rate: z.number().min(0).max(100).nullable().optional(),
  category: optionalString,
  cost_code: z.number().nullable().optional(),
  receipt_date: z.string().nullable().optional(),
  business_percentage: z.number().int().min(0).max(100).optional().default(100),
});

export type ReceiptSchema = z.infer<typeof receiptSchema>;

// ─── Quote ───

export const quoteSchema = z.object({
  client_id: z.string().min(1, "Klant is verplicht"),
  quote_number: trimmedString.min(1, "Offertenummer is verplicht"),
  status: z.enum(["draft", "sent", "accepted", "invoiced", "rejected"]),
  issue_date: z.string().min(1, "Offertedatum is verplicht"),
  valid_until: z.string().nullable(),
  vat_rate: z.union([z.literal(0), z.literal(9), z.literal(21)]),
  notes: optionalString,
  lines: z
    .array(invoiceLineSchema)
    .min(1, "Minimaal één offerteregel is verplicht"),
});

export type QuoteSchema = z.infer<typeof quoteSchema>;

// ─── Tax Payment ───

export const taxPaymentSchema = z.object({
  type: z.enum(["ib", "btw"]),
  period: trimmedString.min(1, "Periode is verplicht"),
  amount: z.number().min(0, "Bedrag mag niet negatief zijn"),
  paid_date: z.string().nullable().optional(),
  reference: optionalString,
});

export type TaxPaymentSchema = z.infer<typeof taxPaymentSchema>;

// ─── Asset ───

export const assetSchema = z.object({
  omschrijving: trimmedString.min(1, "Omschrijving is verplicht"),
  aanschaf_datum: z.string().min(1, "Aanschafdatum is verplicht"),
  aanschaf_prijs: z.number().positive("Aanschafprijs moet positief zijn"),
  restwaarde: z.number().min(0, "Restwaarde mag niet negatief zijn").default(0),
  levensduur: z.number().int().min(1).max(30).default(5),
  categorie: optionalString,
  receipt_id: z.string().uuid().nullable().optional(),
  notitie: optionalString,
  is_verkocht: z.boolean().optional().default(false),
  verkoop_datum: z.string().nullable().optional(),
  verkoop_prijs: z.number().min(0).nullable().optional(),
});

export type AssetSchema = z.infer<typeof assetSchema>;

// ─── Opening Balance ───

export const openingBalanceSchema = z.object({
  eigen_vermogen: z.number().default(0),
  vaste_activa: z.number().min(0).default(0),
  bank_saldo: z.number().default(0),
  debiteuren: z.number().min(0).default(0),
  crediteuren: z.number().min(0).default(0),
  btw_schuld: z.number().min(0).default(0),
  overige_activa: z.number().min(0).default(0),
  overige_passiva: z.number().min(0).default(0),
});

export type OpeningBalanceSchema = z.infer<typeof openingBalanceSchema>;

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

// ─── Recurring Invoice ───

export const recurringInvoiceSchema = z.object({
  client_id: z.string().min(1, "Klant is verplicht"),
  frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  next_run_date: z.string().min(1, "Startdatum is verplicht"),
  vat_rate: z.union([z.literal(0), z.literal(9), z.literal(21)]),
  notes: optionalString,
  is_active: z.boolean().default(true),
  auto_send: z.boolean().default(false),
  lines: z
    .array(invoiceLineSchema)
    .min(1, "Minimaal één factuurregel is verplicht"),
});

export type RecurringInvoiceSchema = z.infer<typeof recurringInvoiceSchema>;

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
