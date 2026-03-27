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
