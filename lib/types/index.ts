// ─── Database row types (match Supabase schema) ───

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type InvoiceUnit = "uren" | "dagen" | "stuks";
export type VatRate = 0 | 9 | 21;

export interface Profile {
  id: string;
  full_name: string;
  studio_name: string | null;
  kvk_number: string | null;
  btw_number: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  iban: string | null;
  bic: string | null;
  role: "user" | "advisor";
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  kvk_number: string | null;
  btw_number: string | null;
  created_at: string;
}

export interface VatDeadline {
  quarter: string;
  deadline: string;
  daysRemaining: number;
  estimatedAmount: number;
  forecastedAmount: number; // Predicted total for the full quarter
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit: InvoiceUnit;
  rate: number;
  amount: number;
  sort_order: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  sent_via: "email" | "peppol" | "both" | null;
  subtotal_ex_vat: number;
  vat_rate: number;
  vat_amount: number;
  total_inc_vat: number;
  notes: string | null;
  share_token: string | null;
  created_at: string;
}

// ─── Composed types for rendering ───

export interface InvoiceData {
  invoice: Invoice;
  lines: InvoiceLine[];
  client: Client;
  profile: Profile;
}

export interface InvoiceWithDetails extends Invoice {
  lines: InvoiceLine[];
  client: Client;
}

// ─── Form/input types (for creating/updating) ───

export interface InvoiceLineInput {
  id: string;
  description: string;
  quantity: number;
  unit: InvoiceUnit;
  rate: number;
}

export interface InvoiceInput {
  client_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  vat_rate: VatRate;
  notes: string | null;
  lines: InvoiceLineInput[];
}

export interface ClientInput {
  name: string;
  contact_name: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  kvk_number: string | null;
  btw_number: string | null;
}

// ─── Receipt types ───

export interface Receipt {
  id: string;
  user_id: string;
  vendor_name: string | null;
  amount_ex_vat: number | null;
  vat_amount: number | null;
  amount_inc_vat: number | null;
  vat_rate: number | null;
  category: string | null;
  cost_code: number | null;
  receipt_date: string | null;
  storage_path: string | null;
  ai_processed: boolean;
  created_at: string;
}

export interface ReceiptInput {
  vendor_name: string | null;
  amount_ex_vat: number | null;
  vat_rate: number | null;
  category: string | null;
  cost_code: number | null;
  receipt_date: string | null;
}

// ─── Bank types ───

export type BankConnectionStatus = "pending" | "active" | "expired" | "error";

export interface BankConnection {
  id: string;
  user_id: string;
  institution_id: string;
  institution_name: string;
  requisition_id: string | null;
  account_id: string | null;
  iban: string | null;
  status: BankConnectionStatus;
  last_synced_at: string | null;
  created_at: string;
}

export interface BankTransaction {
  id: string;
  user_id: string;
  bank_connection_id: string;
  external_id: string;
  booking_date: string;
  amount: number;
  currency: string;
  description: string | null;
  counterpart_name: string | null;
  category: string | null;
  is_income: boolean;
  linked_invoice_id: string | null;
  linked_receipt_id: string | null;
  created_at: string;
}

// ─── Action result types ───

export interface ActionResult<T = undefined> {
  error: string | null;
  data?: T;
}

// ─── Action Feed types (AI Agent System) ───

export type ActionFeedType = "missing_receipt" | "match_suggestion" | "tax_alert" | "uncategorized" | "reminder_suggestion" | "autonomous_match";
export type ActionFeedStatus = "pending" | "resolved" | "ignored";

export interface ActionFeedItem {
  id: string;
  user_id: string;
  type: ActionFeedType;
  status: ActionFeedStatus;
  title: string;
  description: string;
  amount: number | null;
  draft_content: string | null; // Pre-generated content for the action (e.g. email draft)
  related_transaction_id: string | null;
  related_receipt_id: string | null;
  related_invoice_id: string | null;
  suggested_category: string | null;
  ai_confidence: number | null;
  created_at: string;
  resolved_at: string | null;
}

// ─── Asset types ───

export interface Asset {
  id: string;
  user_id: string;
  description: string;
  acquisition_date: string;
  acquisition_cost: number;
  residual_value: number;
  useful_life_months: number;
  category: AssetCategory;
  created_at: string;
}

export type AssetCategory =
  | "computer"
  | "meubilair"
  | "gereedschap"
  | "vervoer"
  | "software"
  | "overig";

export interface AssetWithDepreciation extends Asset {
  monthly_depreciation: number;
  total_depreciated: number;
  book_value: number;
}

export interface AssetInput {
  description: string;
  acquisition_date: string;
  acquisition_cost: number;
  residual_value: number;
  useful_life_months: number;
  category: AssetCategory;
}

// ─── Document types ───

export interface Document {
  id: string;
  user_id: string;
  name: string;
  storage_path: string;
  file_type: string | null;
  file_size: number | null;
  client_id: string | null;
  invoice_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface DocumentInput {
  name: string;
  client_id: string | null;
  invoice_id: string | null;
  notes: string | null;
}

// ─── Advisor types ───

export type AdvisorClientStatus = "pending" | "active" | "revoked";

export interface AdvisorClient {
  id: string;
  advisor_id: string;
  client_user_id: string;
  status: AdvisorClientStatus;
  created_at: string;
}

export interface AdvisorClientWithProfile extends AdvisorClient {
  profile: Pick<Profile, "full_name" | "studio_name">;
}

// ─── Opening balance types ───

export interface OpeningBalance {
  id: string;
  user_id: string;
  fiscal_year: number;
  equity: number;
  fixed_assets: number;
  current_assets: number;
  cash: number;
  liabilities: number;
  created_by: string | null;
  created_at: string;
}

export interface OpeningBalanceInput {
  equity: number;
  fixed_assets: number;
  current_assets: number;
  cash: number;
  liabilities: number;
}

// ─── Safe-to-Spend types ───

export interface SafeToSpendData {
  currentBalance: number;
  estimatedVat: number;
  estimatedIncomeTax: number;
  reservedTotal: number;
  safeToSpend: number;
  taxShieldPotential: number; // Potential tax savings if gear investment is made
  yearRevenueExVat: number; // Jaaromzet excl. BTW (voor IB-prognose)
}
