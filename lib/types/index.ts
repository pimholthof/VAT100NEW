// ─── Database row types (match Supabase schema) ───

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type InvoiceUnit = "uren" | "dagen" | "stuks";
export type VatRate = 0 | 9 | 21;
export type VatScheme = "standard" | "eu_reverse_charge" | "export_outside_eu";

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
  logo_path: string | null;
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
  is_credit_note: boolean;
  original_invoice_id: string | null;
  payment_link: string | null;
  mollie_payment_id: string | null;
  payment_method: string | null;
  vat_scheme: VatScheme;
  created_at: string;
}

// ─── Invoice templates ───

export type InvoiceTemplate = "minimaal" | "klassiek" | "strak";

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
  vat_scheme: VatScheme;
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
  business_percentage: number;
  created_at: string;
}

export interface ReceiptInput {
  vendor_name: string | null;
  amount_ex_vat: number | null;
  vat_rate: number | null;
  category: string | null;
  cost_code: number | null;
  receipt_date: string | null;
  business_percentage?: number;
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

// ─── Quote types ───

export type QuoteStatus = "draft" | "sent" | "accepted" | "invoiced" | "rejected";

export interface Quote {
  id: string;
  user_id: string;
  client_id: string;
  quote_number: string;
  status: QuoteStatus;
  issue_date: string;
  valid_until: string | null;
  vat_rate: number;
  subtotal_ex_vat: number;
  vat_amount: number;
  total_inc_vat: number;
  notes: string | null;
  share_token: string | null;
  converted_invoice_id: string | null;
  created_at: string;
}

export interface QuoteLine {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit: InvoiceUnit;
  rate: number;
  amount: number;
  sort_order: number;
}

export interface QuoteWithDetails extends Quote {
  lines: QuoteLine[];
  client: Client;
}

export interface QuoteData {
  quote: Quote;
  lines: QuoteLine[];
  client: Client;
  profile: Profile;
}

export interface QuoteInput {
  client_id: string;
  quote_number: string;
  status: QuoteStatus;
  issue_date: string;
  valid_until: string | null;
  vat_rate: VatRate;
  notes: string | null;
  lines: InvoiceLineInput[];
}

// ─── Tax Payment types ───

export type TaxPaymentType = "ib" | "btw";

export interface TaxPayment {
  id: string;
  user_id: string;
  type: TaxPaymentType;
  period: string;
  amount: number;
  paid_date: string | null;
  reference: string | null;
  created_at: string;
}

export interface TaxPaymentInput {
  type: TaxPaymentType;
  period: string;
  amount: number;
  paid_date: string | null;
  reference: string | null;
}

// ─── Safe-to-Spend types ───

export interface SafeToSpendData {
  currentBalance: number;
  estimatedVat: number;
  estimatedIncomeTax: number;
  reservedTotal: number;
  safeToSpend: number;
  taxShieldPotential: number; // Potential tax savings if gear investment is made
}

// ─── Subscription types ───

export type SubscriptionStatus = "pending" | "active" | "past_due" | "cancelled" | "expired";

export interface Plan {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  interval_months: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  mollie_customer_id: string | null;
  mollie_subscription_id: string | null;
  mollie_mandate_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionWithPlan extends Subscription {
  plan: Plan;
}

export interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  mollie_payment_id: string;
  amount_cents: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

// ─── VAT Return types ───

export type VatReturnStatus = "draft" | "locked" | "submitted";

export interface VatReturn {
  id: string;
  user_id: string;
  year: number;
  quarter: number;
  rubriek_1a_omzet: number;
  rubriek_1a_btw: number;
  rubriek_1b_omzet: number;
  rubriek_1b_btw: number;
  rubriek_1c_omzet: number;
  rubriek_1c_btw: number;
  rubriek_2a_omzet: number;
  rubriek_2a_btw: number;
  rubriek_3b_omzet: number;
  rubriek_3b_btw: number;
  rubriek_4a_omzet: number;
  rubriek_4a_btw: number;
  rubriek_4b_omzet: number;
  rubriek_4b_btw: number;
  rubriek_5b: number;
  status: VatReturnStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Ledger types ───

export interface LedgerAccount {
  id: string;
  code: number;
  name: string;
  type: string;
  parent_code: number | null;
  is_system: boolean;
}

export interface LedgerEntry {
  id: string;
  user_id: string;
  entry_date: string;
  description: string;
  source_invoice_id: string | null;
  source_receipt_id: string | null;
  debit_account: number;
  credit_account: number;
  amount: number;
  created_at: string;
}

export interface LedgerEntryInput {
  entry_date: string;
  description: string;
  source_invoice_id?: string | null;
  source_receipt_id?: string | null;
  debit_account: number;
  credit_account: number;
  amount: number;
}

// ─── Hours Log types ───

export interface HoursLog {
  id: string;
  user_id: string;
  date: string;
  hours: number;
  category: string | null;
  created_at: string;
}

export interface HoursLogInput {
  date: string;
  hours: number;
  category: string | null;
  quote_id?: string | null;
  project_name?: string | null;
}

// ─── Trips types ───

export interface Trip {
  id: string;
  user_id: string;
  date: string;
  distance_km: number;
  is_return_trip: boolean;
  purpose: string | null;
  created_at: string;
}

export interface TripInput {
  date: string;
  distance_km: number;
  is_return_trip?: boolean;
  purpose: string | null;
}

// ─── Asset types ───

export type DepreciationMethod = "linear" | "willekeurig";

export interface Asset {
  id: string;
  user_id: string;
  omschrijving: string;
  aanschaf_datum: string;
  aanschaf_prijs: number;
  restwaarde: number;
  levensduur: number;
  categorie: string | null;
  receipt_id: string | null;
  notitie: string | null;
  is_verkocht: boolean;
  verkoop_datum: string | null;
  verkoop_prijs: number | null;
  depreciation_method: DepreciationMethod;
  created_at: string;
}

export interface AssetInput {
  omschrijving: string;
  aanschaf_datum: string;
  aanschaf_prijs: number;
  restwaarde: number;
  levensduur: number;
  categorie: string | null;
  receipt_id: string | null;
  notitie: string | null;
  is_verkocht?: boolean;
  verkoop_datum?: string | null;
  verkoop_prijs?: number | null;
  depreciation_method?: DepreciationMethod;
}

// ─── Opening Balance types ───

export interface OpeningBalance {
  id: string;
  user_id: string;
  year: number;
  eigen_vermogen: number;
  vaste_activa: number;
  bank_saldo: number;
  debiteuren: number;
  crediteuren: number;
  btw_schuld: number;
  overige_activa: number;
  overige_passiva: number;
  created_at: string;
}

export interface OpeningBalanceInput {
  eigen_vermogen: number;
  vaste_activa: number;
  bank_saldo: number;
  debiteuren: number;
  crediteuren: number;
  btw_schuld: number;
  overige_activa: number;
  overige_passiva: number;
}

// ─── Import types ───

export interface ImportMapping {
  source: string;
  target: string;
}

export interface ImportPreviewRow {
  [key: string]: string;
}

// ─── Admin types ───

export type UserRole = "user" | "admin";
export type UserStatus = "active" | "suspended";

export interface AdminUser {
  id: string;
  full_name: string;
  studio_name: string | null;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  invoice_count: number;
  total_revenue: number;
  last_activity: string | null;
}

export interface AdminUserDetail {
  profile: Profile & { role: UserRole; status: UserStatus; email: string };
  stats: {
    totalInvoices: number;
    totalRevenue: number;
    openInvoices: number;
    openAmount: number;
    totalClients: number;
    totalReceipts: number;
  };
  recentInvoices: Array<{
    id: string;
    invoice_number: string;
    status: InvoiceStatus;
    issue_date: string;
    total_inc_vat: number;
    client_name: string;
  }>;
}

export interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalInvoices: number;
  totalRevenue: number;
  newUsersThisMonth: number;
}

// ─── Lead & Sales Pipeline types ───

export type LeadLifecycle = "Nieuw" | "Link Verstuurd" | "Plan Gekozen" | "Klant" | "On hold" | "Niet Relevant";
export type LeadSource = "website" | "substack" | "referral" | "manual" | "marketing" | "branding" | "waitlist" | "via_via";

export interface Lead {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  source: LeadSource;
  lifecycle_stage: LeadLifecycle;
  target_plan_id: string | null;
  score_fit: number;
  score_engagement: number;
  vat100_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── Onboarding types ───

export interface OnboardingTask {
  id: string;
  user_id: string;
  lead_id: string | null;
  task_key: string;
  title: string;
  description: string | null;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  sort_order: number;
  created_at: string;
}

// ─── Feedback types ───

export type FeedbackType = "bug" | "feature" | "nps" | "general";
export type FeedbackStatus = "open" | "in_progress" | "resolved" | "wont_fix";

export interface Feedback {
  id: string;
  user_id: string;
  type: FeedbackType;
  score: number | null;
  message: string;
  page_url: string | null;
  status: FeedbackStatus;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

// ─── Hours Log extended ───

export interface HoursLogExtended extends HoursLog {
  quote_id: string | null;
  quote_line_id: string | null;
  project_name: string | null;
}

export interface LeadWithActivity extends Lead {
  activities?: Array<{
    id: string;
    activity_type: string;
    description: string;
    created_at: string;
  }>;
}
