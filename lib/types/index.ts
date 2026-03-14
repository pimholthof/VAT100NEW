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
  created_at: string;
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
}

// ─── Action result types ───

export interface ActionResult<T = undefined> {
  error: string | null;
  data?: T;
}
