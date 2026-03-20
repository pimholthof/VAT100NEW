// ─── Annual Account (Jaarrekening) types ───

export interface RawFinancialData {
  invoices: RawInvoice[];
  expenses: RawExpense[];
  bankTransactions: RawBankTransaction[];
  vatDeclarations: RawVatDeclaration[];
  assets: RawAsset[];
  profile: RawProfile;
  priorYearFigures: AnnualFigures | null;
}

export interface RawInvoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  subtotal_ex_vat: number;
  vat_amount: number;
  vat_rate: number;
  status: string;
  client_name: string;
}

export interface RawExpense {
  id: string;
  vendor_name: string | null;
  amount_ex_vat: number;
  vat_amount: number;
  category: string | null;
  receipt_date: string | null;
}

export interface RawBankTransaction {
  id: string;
  booking_date: string;
  amount: number;
  description: string | null;
  counterpart_name: string | null;
}

export interface RawVatDeclaration {
  id: string;
  period: string; // e.g. "Q1 2025"
  vat_charged: number;
  vat_input: number;
  balance: number;
}

export interface RawAsset {
  id: string;
  description: string;
  acquisition_date: string;
  acquisition_cost: number;
  residual_value: number;
  depreciation_rate: number;
  useful_life_months: number;
}

export interface RawProfile {
  full_name: string;
  studio_name: string | null;
  kvk_number: string | null;
  btw_number: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  iban: string | null;
  bic: string | null;
}

// ─── Calculated output ───

export interface RevenueBreakdown {
  domestic: number;
  outsideEu: number;
  intraEu: number;
  total: number;
}

export interface ExpenseLine {
  category: string;
  amount: number;
  percentage: number;
}

export interface DepreciationLine {
  description: string;
  acquisitionDate: string;
  acquisitionCost: number;
  bookValueStart: number;
  depreciationAmount: number;
  bookValueEnd: number;
  residualValue: number;
  rate: number;
}

export interface BalanceSheet {
  assets: {
    tangibleFixed: number;
    currentAssets: number;
    cash: number;
    total: number;
  };
  liabilities: {
    equity: number;
    currentLiabilities: number;
    total: number;
  };
}

export interface EquityMovement {
  openingBalance: number;
  result: number;
  privateWithdrawals: number;
  closingBalance: number;
}

export interface VatQuarter {
  period: string;
  charged: number;
  input: number;
  balance: number;
}

export interface VatReconciliation {
  quarters: VatQuarter[];
  totalCharged: number;
  totalInput: number;
  totalBalance: number;
  liabilityAtYearEnd: number;
}

export interface PriorYearComparison {
  revenue: number;
  expenses: number;
  depreciation: number;
  result: number;
  tangibleFixed: number;
  cash: number;
  equity: number;
  currentLiabilities: number;
}

export interface AnnualFigures {
  fiscalYear: number;
  revenue: RevenueBreakdown;
  expenses: ExpenseLine[];
  expensesTotal: number;
  depreciation: DepreciationLine[];
  depreciationTotal: number;
  result: number;
  balanceSheet: BalanceSheet;
  equity: EquityMovement;
  vat: VatReconciliation;
  priorYear: PriorYearComparison | null;
}

// ─── Database row ───

export type AnnualAccountStatus = "draft" | "reviewed" | "final";

export interface AnnualAccount {
  id: string;
  user_id: string;
  fiscal_year: number;
  status: AnnualAccountStatus;
  figures: AnnualFigures;
  pdf_nl_path: string | null;
  pdf_en_path: string | null;
  generated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}
