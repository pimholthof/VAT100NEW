// ─── Centrale navigatie-configuratie ───
// Single source of truth voor DashboardNav, MobileBottomNav, CommandMenu,
// QuickActionMenu en Breadcrumb.

export type NavGroup = "main" | "admin" | "secondary";

export interface NavItem {
  href: string;
  labelKey: string;
  icon?: string;
  group: NavGroup;
}

export interface QuickAction {
  href: string;
  labelKey: string;
}

// ─── Navigatie-items ───

export const NAV_ITEMS: NavItem[] = [
  // Core — drawer + mobile bottom nav
  { href: "/dashboard", labelKey: "overview", icon: "◉", group: "main" },
  { href: "/dashboard/invoices", labelKey: "invoices", icon: "□", group: "main" },
  { href: "/dashboard/expenses", labelKey: "expenses", icon: "◇", group: "main" },
  { href: "/dashboard/clients", labelKey: "clients", icon: "○", group: "main" },
  { href: "/dashboard/tax", labelKey: "tax", icon: "△", group: "main" },
  // Administratie — drawer alleen
  { href: "/dashboard/hours", labelKey: "hours", group: "admin" },
  { href: "/dashboard/trips", labelKey: "trips", group: "admin" },
  { href: "/dashboard/assets", labelKey: "assets", group: "admin" },
  { href: "/dashboard/documents", labelKey: "documents", group: "admin" },
  // Meer — secundaire features
  { href: "/dashboard/berichten", labelKey: "messages", group: "secondary" },
  { href: "/dashboard/ai-assistant", labelKey: "chat", group: "secondary" },
  { href: "/dashboard/resources", labelKey: "resources", group: "secondary" },
];

// ─── Snelacties (+) ───

export const QUICK_ACTIONS: QuickAction[] = [
  { href: "/dashboard/invoices/new", labelKey: "newInvoice" },
  { href: "/dashboard/quotes/new", labelKey: "newQuote" },
  { href: "/dashboard/clients/new", labelKey: "newClient" },
  { href: "/dashboard/receipts/new", labelKey: "newReceipt" },
];

// ─── Breadcrumb segment labels ───
// Maps URL segments to i18n nav keys (or literal strings for segments
// without a nav translation).

export const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "overview",
  invoices: "invoices",
  clients: "clients",
  expenses: "expenses",
  assets: "assets",
  hours: "hours",
  trips: "trips",
  tax: "tax",
  documents: "documents",
  import: "import",
  settings: "settings",
  berichten: "messages",
  resources: "resources",
  receipts: "receipts",
  quotes: "quotes",
  new: "new",
  preview: "preview",
  bank: "bank",
  report: "report",
  "ai-assistant": "chat",
  "opening-balance": "openingBalance",
  suppletie: "suppletie",
  abonnement: "subscription",
  subscription: "subscription",
};
