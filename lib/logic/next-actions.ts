/**
 * Predictive Calm — de éérstvolgende dingen die ertoe doen.
 *
 * Het canvas vertelt je rustig wat er nú aandacht vraagt, in plaats van een
 * dashboard vol cijfers waar je zelf conclusies uit moet trekken. Eén korte,
 * geprioriteerde lijst: te laat betaalde facturen, een naderende BTW-aangifte
 * die al klaarstaat, openstaand om te innen — of niets, en dat is ook goed.
 *
 * Puur en deterministisch (geen AI, geen server-imports): zo is de uitkomst
 * voorspelbaar, testbaar en overal identiek.
 */

export type NextActionKind =
  | "overdue"
  | "vat"
  | "reviewReceipts"
  | "collect"
  | "firstInvoice"
  | "allClear";

export type NextActionTone = "urgent" | "attention" | "calm" | "done";

export interface NextAction {
  kind: NextActionKind;
  tone: NextActionTone;
  /** Bestemming voor de één-klik-actie; leeg bij `allClear`. */
  href: string;
  count?: number;
  amount?: number;
  quarter?: string;
  days?: number;
}

export interface NextActionsInput {
  /** Aantal facturen dat te laat is. */
  overdueCount: number;
  overdueAmount: number;
  /** Verstuurd maar nog niet vervallen (nog te innen). */
  collectCount: number;
  collectAmount: number;
  /** Heeft de gebruiker al ooit een factuur (om beginners te herkennen)? */
  hasAnyInvoice: boolean;
  /** Eerstvolgende BTW-aangifte, indien bekend. */
  vat?: { quarter: string; daysRemaining: number; amount: number } | null;
  /**
   * Aantal bon-bevindingen uit de controle-laag dat aandacht vraagt
   * (mogelijke dubbele bonnen + onvolledige bonnen). Houdt je administratie
   * waterdicht vóór de aangifte.
   */
  receiptIssues?: number;
}

/** Binnen hoeveel dagen een BTW-aangifte als "nu" telt op het canvas. */
export const VAT_ACTION_WINDOW_DAYS = 30;

/** Maximaal aantal acties dat we tegelijk tonen — rust boven volledigheid. */
export const MAX_NEXT_ACTIONS = 3;

/**
 * Leidt de geprioriteerde lijst met eerstvolgende acties af.
 *
 * Volgorde van urgentie: te laat → BTW-deadline (binnen het venster) →
 * te innen → eerste factuur. Is er niets, dan één geruststellende
 * "alles loopt"-staat.
 */
export function deriveNextActions(input: NextActionsInput): NextAction[] {
  const actions: NextAction[] = [];

  if (input.overdueCount > 0) {
    actions.push({
      kind: "overdue",
      tone: "urgent",
      href: "/dashboard/invoices?status=overdue",
      count: input.overdueCount,
      amount: input.overdueAmount,
    });
  }

  if (input.vat && input.vat.amount > 0 && input.vat.daysRemaining <= VAT_ACTION_WINDOW_DAYS) {
    actions.push({
      kind: "vat",
      tone: "attention",
      href: "/dashboard/tax",
      quarter: input.vat.quarter,
      days: Math.max(0, input.vat.daysRemaining),
      amount: input.vat.amount,
    });
  }

  // Controle-laag: mogelijke dubbele of onvolledige bonnen — rustig opvolgen
  // zodat de kosten (en dus de aangifte) kloppen.
  if ((input.receiptIssues ?? 0) > 0) {
    actions.push({
      kind: "reviewReceipts",
      tone: "attention",
      href: "/dashboard/receipts",
      count: input.receiptIssues,
    });
  }

  if (input.collectCount > 0) {
    actions.push({
      kind: "collect",
      tone: "calm",
      href: "/dashboard/invoices",
      count: input.collectCount,
      amount: input.collectAmount,
    });
  }

  if (!input.hasAnyInvoice) {
    actions.push({
      kind: "firstInvoice",
      tone: "calm",
      href: "/dashboard/invoices/new",
    });
  }

  if (actions.length === 0) {
    actions.push({ kind: "allClear", tone: "done", href: "" });
  }

  return actions.slice(0, MAX_NEXT_ACTIONS);
}
