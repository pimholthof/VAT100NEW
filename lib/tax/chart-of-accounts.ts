/**
 * Rekeningschema (Chart of Accounts) voor ZZP'ers
 *
 * Gebaseerd op het standaard Nederlandse rekeningschema,
 * vereenvoudigd voor creatieve freelancers (kasboek-plus).
 *
 * Categorieën:
 * 1xxx = Balansrekeningen (Activa)
 * 2xxx = Balansrekeningen (Passiva)
 * 3xxx = Inkomsten
 * 4xxx = Kosten
 * 8xxx = Omzet (tegenhanger voor facturen)
 */

export interface AccountDef {
  code: number;
  name: string;
  type: "asset" | "liability" | "revenue" | "expense" | "equity";
  category: string;
}

// ── Balansrekeningen ──

export const BALANCE_ACCOUNTS: AccountDef[] = [
  { code: 1000, name: "Bank", type: "asset", category: "Vlottende activa" },
  { code: 1100, name: "Debiteuren", type: "asset", category: "Vlottende activa" },
  { code: 1200, name: "Vaste activa", type: "asset", category: "Vaste activa" },
  { code: 1300, name: "BTW te vorderen", type: "asset", category: "Vlottende activa" },
  { code: 2000, name: "Crediteuren", type: "liability", category: "Kort vreemd vermogen" },
  { code: 2100, name: "BTW te betalen", type: "liability", category: "Kort vreemd vermogen" },
  { code: 2200, name: "Inkomstenbelasting", type: "liability", category: "Kort vreemd vermogen" },
  { code: 2500, name: "Eigen vermogen", type: "equity", category: "Eigen vermogen" },
];

// ── Inkomsten (omzet) ──

export const REVENUE_ACCOUNTS: AccountDef[] = [
  { code: 8000, name: "Omzet diensten", type: "revenue", category: "Omzet" },
  { code: 8100, name: "Omzet producten", type: "revenue", category: "Omzet" },
  { code: 8200, name: "Omzet EU (ICP)", type: "revenue", category: "Omzet" },
  { code: 8300, name: "Omzet export (buiten EU)", type: "revenue", category: "Omzet" },
];

// ── Kostenrekeningen (matched aan receipt cost_codes) ──

export const EXPENSE_ACCOUNTS: AccountDef[] = [
  { code: 4100, name: "Huur", type: "expense", category: "Huisvesting" },
  { code: 4105, name: "Energie", type: "expense", category: "Huisvesting" },
  { code: 4195, name: "Overige huisvesting", type: "expense", category: "Huisvesting" },
  { code: 4230, name: "Kleine investering", type: "expense", category: "Bedrijfsmiddelen" },
  { code: 4300, name: "Kantoorkosten", type: "expense", category: "Kantoor" },
  { code: 4330, name: "Computer & software", type: "expense", category: "Kantoor" },
  { code: 4340, name: "Telefoon", type: "expense", category: "Kantoor" },
  { code: 4341, name: "Webhosting & internet", type: "expense", category: "Kantoor" },
  { code: 4350, name: "Porto", type: "expense", category: "Kantoor" },
  { code: 4360, name: "Vakliteratuur", type: "expense", category: "Kantoor" },
  { code: 4400, name: "Verzekeringen", type: "expense", category: "Verzekeringen" },
  { code: 4500, name: "Vervoer (OV/auto)", type: "expense", category: "Vervoer" },
  { code: 4510, name: "Reiskosten", type: "expense", category: "Vervoer" },
  { code: 4520, name: "Parkeren", type: "expense", category: "Vervoer" },
  { code: 4600, name: "Reclame & marketing", type: "expense", category: "Marketing" },
  { code: 4610, name: "Representatie", type: "expense", category: "Marketing" },
  { code: 4620, name: "Website & SEO", type: "expense", category: "Marketing" },
  { code: 4700, name: "Accountant & advies", type: "expense", category: "Advies" },
  { code: 4710, name: "Boekhouding", type: "expense", category: "Advies" },
  { code: 4720, name: "Juridisch", type: "expense", category: "Advies" },
  { code: 4750, name: "Bankkosten", type: "expense", category: "Financieel" },
  { code: 4800, name: "Abonnementen & licenties", type: "expense", category: "Software" },
  { code: 4900, name: "Eten & drinken zakelijk", type: "expense", category: "Representatie" },
  { code: 4910, name: "Gereedschap & materiaal", type: "expense", category: "Bedrijfsmiddelen" },
  { code: 4999, name: "Overig", type: "expense", category: "Overig" },
];

// ── All accounts combined ──

export const ALL_ACCOUNTS: AccountDef[] = [
  ...BALANCE_ACCOUNTS,
  ...REVENUE_ACCOUNTS,
  ...EXPENSE_ACCOUNTS,
];

// ── Lookup helpers ──

const accountMap = new Map(ALL_ACCOUNTS.map((a) => [a.code, a]));

export function getAccount(code: number): AccountDef | undefined {
  return accountMap.get(code);
}

export function getAccountName(code: number): string {
  return accountMap.get(code)?.name ?? `Onbekend (${code})`;
}

// ── Representatie cost codes (80/20 rule applies) ──

export const REPRESENTATIE_CODES = new Set([4610, 4900]);

/**
 * Determines if a cost code falls under representatie rules (80/20 split).
 * Representatiekosten: 80% aftrekbaar, 20% niet.
 */
export function isRepresentatie(costCode: number | null): boolean {
  return costCode !== null && REPRESENTATIE_CODES.has(costCode);
}

// ── Horeca BTW: cost codes where VAT should be 0% for horeca ──
// (Used as a validation hint, not enforcement)

export const HORECA_CODES = new Set([4900]);

/**
 * Revenue account selection based on invoice VAT scheme.
 */
export function getRevenueAccountCode(
  vatScheme: "standard" | "eu_reverse_charge" | "export_outside_eu",
): number {
  switch (vatScheme) {
    case "eu_reverse_charge":
      return 8200;
    case "export_outside_eu":
      return 8300;
    default:
      return 8000;
  }
}
