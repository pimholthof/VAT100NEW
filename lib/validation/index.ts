import { z } from "zod";

// ─── Shared ───

const trimmedString = z.string().trim();
const optionalString = trimmedString.nullable().optional();

/** Optionele string met maximale lengte */
function optStr(max: number) {
  return trimmedString.max(max).nullable().optional();
}

// ─── Client ───

export const clientSchema = z.object({
  name: trimmedString.min(1, "Naam is verplicht").max(200),
  contact_name: optStr(200),
  email: optionalString.refine(
    (v) => !v || z.string().email().safeParse(v).success,
    "Ongeldig e-mailadres"
  ),
  address: optStr(500),
  city: optStr(100),
  postal_code: optStr(10),
  kvk_number: optStr(20),
  btw_number: optStr(20),
});

export type ClientSchema = z.infer<typeof clientSchema>;

// ─── Invoice Line ───

const invoiceLineSchema = z.object({
  id: z.string(),
  description: trimmedString.min(1, "Omschrijving is verplicht").max(500),
  quantity: z.number().positive("Aantal moet positief zijn").max(99999, "Aantal te hoog"),
  unit: z.enum(["uren", "dagen", "stuks"]),
  rate: z.number().min(0, "Tarief mag niet negatief zijn").max(999999, "Tarief te hoog"),
});

// ─── Invoice ───

export const invoiceSchema = z.object({
  client_id: z.string().min(1, "Klant is verplicht"),
  invoice_number: trimmedString.min(1, "Factuurnummer is verplicht").max(50),
  status: z.enum(["draft", "sent", "paid", "overdue"]),
  issue_date: z.string().min(1, "Factuurdatum is verplicht"),
  due_date: z.string().nullable(),
  vat_rate: z.union([z.literal(0), z.literal(9), z.literal(21)]),
  notes: optStr(2000),
  lines: z
    .array(invoiceLineSchema)
    .min(1, "Minimaal één factuurregel is verplicht"),
});

export type InvoiceSchema = z.infer<typeof invoiceSchema>;

// ─── Receipt ───

export const receiptSchema = z.object({
  vendor_name: optStr(200),
  amount_ex_vat: z.number().min(0).max(999999, "Bedrag te hoog").nullable().optional(),
  vat_rate: z.union([z.literal(0), z.literal(9), z.literal(21)]).nullable().optional(),
  category: optionalString,
  cost_code: z.number().nullable().optional(),
  receipt_date: z.string().nullable().optional(),
});

export type ReceiptSchema = z.infer<typeof receiptSchema>;

// ─── Profile ───

export const profileSchema = z.object({
  full_name: trimmedString.min(1, "Naam is verplicht").max(200),
  studio_name: optStr(200),
  kvk_number: optStr(20),
  btw_number: optStr(20),
  address: optStr(500),
  city: optStr(100),
  postal_code: optStr(10),
  iban: optStr(34),
  bic: optStr(11),
  expected_annual_revenue: z.number().min(0, "Verwachte omzet mag niet negatief zijn").max(99999999, "Bedrag te hoog").optional(),
  zelfstandigenaftrek: z.boolean().optional(),
  monthly_fixed_costs: z.number().min(0, "Vaste kosten mogen niet negatief zijn").max(999999, "Bedrag te hoog").optional(),
  btw_period: z.enum(["kwartaal", "maand"]).optional(),
});

export type ProfileSchema = z.infer<typeof profileSchema>;

// ─── Asset ───

export const assetSchema = z.object({
  description: trimmedString.min(1, "Omschrijving is verplicht").max(500),
  acquisition_date: z.string().min(1, "Aankoopdatum is verplicht"),
  acquisition_cost: z.number().positive("Aanschafwaarde moet positief zijn").max(99999999, "Bedrag te hoog"),
  residual_value: z.number().min(0, "Restwaarde mag niet negatief zijn").max(99999999, "Bedrag te hoog"),
  useful_life_months: z.number().int().min(1, "Levensduur moet minimaal 1 maand zijn").max(600, "Levensduur te lang"),
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
  equity: z.number().max(999999999, "Bedrag te hoog"),
  fixed_assets: z.number().min(0, "Mag niet negatief zijn").max(999999999, "Bedrag te hoog"),
  current_assets: z.number().min(0, "Mag niet negatief zijn").max(999999999, "Bedrag te hoog"),
  cash: z.number().min(0, "Mag niet negatief zijn").max(999999999, "Bedrag te hoog"),
  liabilities: z.number().min(0, "Mag niet negatief zijn").max(999999999, "Bedrag te hoog"),
});

export type OpeningBalanceSchema = z.infer<typeof openingBalanceSchema>;

// ─── VAT Return ───

export const vatReturnSchema = z.object({
  period_start: z.string().min(1, "Startdatum is verplicht"),
  period_end: z.string().min(1, "Einddatum is verplicht"),
  output_vat: z.number().min(0, "Output BTW mag niet negatief zijn").max(99999999, "Bedrag te hoog"),
  input_vat: z.number().min(0, "Input BTW mag niet negatief zijn").max(99999999, "Bedrag te hoog"),
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
