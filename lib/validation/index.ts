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
  vat_rate: z.union([z.literal(0), z.literal(9), z.literal(21)]).default(21),
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
  expected_annual_revenue: z.number().min(0, "Verwachte omzet mag niet negatief zijn").optional(),
  zelfstandigenaftrek: z.boolean().optional(),
  monthly_fixed_costs: z.number().min(0, "Vaste kosten mogen niet negatief zijn").optional(),
  btw_period: z.enum(["kwartaal", "maand"]).optional(),
});

export type ProfileSchema = z.infer<typeof profileSchema>;

// ─── Asset ───

export const assetSchema = z.object({
  description: trimmedString.min(1, "Omschrijving is verplicht"),
  acquisition_date: z.string().min(1, "Aankoopdatum is verplicht"),
  acquisition_cost: z.number().positive("Aanschafwaarde moet positief zijn"),
  residual_value: z.number().min(0, "Restwaarde mag niet negatief zijn"),
  useful_life_months: z.number().int().min(1, "Levensduur moet minimaal 1 maand zijn"),
  category: z.enum([
    "computer",
    "meubilair",
    "gereedschap",
    "vervoer",
    "software",
    "overig",
  ]),
});

export type AssetSchema = z.infer<typeof assetSchema>;

// ─── Opening Balance ───

export const openingBalanceSchema = z.object({
  equity: z.number(),
  fixed_assets: z.number().min(0, "Mag niet negatief zijn"),
  current_assets: z.number().min(0, "Mag niet negatief zijn"),
  cash: z.number().min(0, "Mag niet negatief zijn"),
  liabilities: z.number().min(0, "Mag niet negatief zijn"),
});

export type OpeningBalanceSchema = z.infer<typeof openingBalanceSchema>;

// ─── VAT Return ───

export const vatReturnSchema = z.object({
  period_start: z.string().min(1, "Startdatum is verplicht"),
  period_end: z.string().min(1, "Einddatum is verplicht"),
  output_vat: z.number().min(0, "Output BTW mag niet negatief zijn"),
  input_vat: z.number().min(0, "Input BTW mag niet negatief zijn"),
});

export type VatReturnSchema = z.infer<typeof vatReturnSchema>;

// ─── Banking ───

export const institutionQuerySchema = z.object({
  country: z.string().length(2, "Landcode moet 2 tekens zijn").default("NL"),
});

export type InstitutionQuerySchema = z.infer<typeof institutionQuerySchema>;

export const createRequisitionSchema = z.object({
  institution_id: z.string().min(1, "Bank is verplicht"),
});

export type CreateRequisitionSchema = z.infer<typeof createRequisitionSchema>;

export const requisitionStatusSchema = z.object({
  requisition_id: z.string().uuid("Ongeldig requisition ID"),
});

export type RequisitionStatusSchema = z.infer<typeof requisitionStatusSchema>;

export const importTransactionsSchema = z.object({
  account_id: z.string().uuid("Ongeldig account ID"),
});

export type ImportTransactionsSchema = z.infer<typeof importTransactionsSchema>;

export const disconnectBankSchema = z.object({
  connection_id: z.string().uuid("Ongeldig connectie ID"),
});

export type DisconnectBankSchema = z.infer<typeof disconnectBankSchema>;

// ─── Credit Note ───

export const creditNoteSchema = z.object({
  invoice_id: z.string().uuid("Ongeldig factuur ID"),
  credit_number: trimmedString.min(1, "Creditnotanummer is verplicht"),
  reason: trimmedString.min(1, "Reden is verplicht"),
  amount_ex_vat: z.number().min(0, "Bedrag mag niet negatief zijn"),
  vat_rate: z.union([z.literal(0), z.literal(9), z.literal(21)]),
});

export type CreditNoteSchema = z.infer<typeof creditNoteSchema>;

// ─── Payment ───

export const paymentSchema = z.object({
  invoice_id: z.string().uuid("Ongeldig factuur ID"),
  amount: z.number().positive("Bedrag moet positief zijn"),
  payment_date: z.string().min(1, "Betaaldatum is verplicht"),
  method: z.enum(["bank", "contant", "creditcard", "overig"]).nullable().optional(),
  notes: optionalString,
});

export type PaymentSchema = z.infer<typeof paymentSchema>;

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
