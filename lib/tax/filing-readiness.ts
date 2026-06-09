/**
 * Filing-readiness — de "zo makkelijk mogelijk"-hersenen voor alle aangiftes.
 *
 * BTW-aangifte (per kwartaal), IB-aangifte (per jaar) en de jaarrekening (per
 * jaar) zijn dezelfde machine op drie tijdshorizonnen. Deze pure module bepaalt
 * per aangifte: de status in de levenscyclus, wat er nog ontbreekt (blockers),
 * het bedrag dat centraal staat, en de éérstvolgende één-tap actie. Zo weet
 * zowel de gebruiker ("wat moet ik nu doen?") als de autonome laag ("mag ik dit
 * concept voorbereiden?") precies waar elke aangifte staat.
 *
 * Puur en deterministisch: geen DB/AI/server-imports. De server verzamelt de
 * feiten; deze module velt het oordeel; de UI en de Predictive-Calm-laag tonen
 * de éérstvolgende stap.
 */

export type FilingKind = "btw" | "ib" | "jaarrekening";

export type FilingStatus =
  | "niet_van_toepassing" // bv. KOR-ondernemer voor de BTW
  | "onvolledig" // periode nog open of blokkerende ontbrekende data
  | "klaar" // alles compleet, klaar om voor te bereiden/genereren
  | "concept" // concept voorbereid, wacht op controle/vergrendeling
  | "vergrendeld" // vergrendeld, klaar om in te dienen
  | "ingediend"; // ingediend (en evt. betaald)

export type FilingNextAction =
  | "wachten" // periode nog niet afgelopen
  | "voorbereiden"
  | "controleren"
  | "vergrendelen"
  | "indienen"
  | "betalen"
  | "genereren";

export interface FilingBlocker {
  code: "period_open" | "receipt_incomplete" | "no_activity" | "profile_incomplete" | "balance_mismatch";
  severity: "warning" | "blocking";
  count?: number;
}

export interface FilingReadiness {
  kind: FilingKind;
  /** "Q2 2026" voor BTW, "2026" voor IB/jaarrekening. */
  period: string;
  status: FilingStatus;
  blockers: FilingBlocker[];
  /** Bedrag dat centraal staat: netto BTW / netto IB / resultaat. */
  amount?: number;
  /** De éérstvolgende één-tap actie (undefined = niets te doen). */
  nextAction?: FilingNextAction;
  deadline?: string | null;
  daysRemaining?: number;
}

function hasBlocking(blockers: FilingBlocker[]): boolean {
  return blockers.some((b) => b.severity === "blocking");
}

// ─── BTW (per kwartaal) ───

export interface BtwFilingInput {
  period: string;
  /** Is het kwartaal voorbij (en dus indienbaar)? */
  periodEnded: boolean;
  deadline: string | null;
  daysRemaining: number;
  returnStatus: "none" | "draft" | "locked" | "submitted";
  /** Is er een BTW-betaling voor deze periode vastgelegd? */
  paid: boolean;
  /** Aantal onvolledige bonnen in de periode (zonder bedrag/tarief). */
  incompleteReceiptCount: number;
  /** Netto BTW (5a − 5b); positief = te betalen. */
  netVat: number;
  usesKor: boolean;
}

export function assessBtwFiling(input: BtwFilingInput): FilingReadiness {
  const base = {
    kind: "btw" as const,
    period: input.period,
    amount: input.netVat,
    deadline: input.deadline,
    daysRemaining: input.daysRemaining,
  };

  if (input.usesKor) {
    return { ...base, status: "niet_van_toepassing", blockers: [] };
  }

  if (input.returnStatus === "submitted") {
    const needsPayment = input.netVat > 0 && !input.paid;
    return {
      ...base,
      status: "ingediend",
      blockers: [],
      nextAction: needsPayment ? "betalen" : undefined,
    };
  }

  if (input.returnStatus === "locked") {
    return { ...base, status: "vergrendeld", blockers: [], nextAction: "indienen" };
  }

  const blockers: FilingBlocker[] = [];
  if (input.incompleteReceiptCount > 0) {
    blockers.push({ code: "receipt_incomplete", severity: "warning", count: input.incompleteReceiptCount });
  }

  if (input.returnStatus === "draft") {
    return {
      ...base,
      status: "concept",
      blockers,
      nextAction: blockers.length > 0 ? "controleren" : "vergrendelen",
    };
  }

  // Nog geen aangifte voorbereid.
  if (!input.periodEnded) {
    return {
      ...base,
      status: "onvolledig",
      blockers: [{ code: "period_open", severity: "blocking" }],
      nextAction: "wachten",
    };
  }

  return {
    ...base,
    status: blockers.length > 0 ? "onvolledig" : "klaar",
    blockers,
    nextAction: blockers.length > 0 ? "controleren" : "voorbereiden",
  };
}

// ─── IB (per jaar) ───

export interface IbFilingInput {
  year: number;
  /** Is het belastingjaar voorbij? */
  yearEnded: boolean;
  hasActivity: boolean;
  /** Profiel compleet genoeg om aangifte te doen (naam + BTW/KVK). */
  profileComplete: boolean;
  incompleteReceiptCount: number;
  nettoIB: number;
  /** Is er een IB-betaling/aanslag voor dit jaar vastgelegd? */
  paid: boolean;
}

export function assessIbFiling(input: IbFilingInput): FilingReadiness {
  const base = {
    kind: "ib" as const,
    period: String(input.year),
    amount: input.nettoIB,
  };

  if (!input.hasActivity && !input.yearEnded) {
    return { ...base, status: "niet_van_toepassing", blockers: [] };
  }

  const blockers: FilingBlocker[] = [];
  if (!input.profileComplete) {
    blockers.push({ code: "profile_incomplete", severity: "blocking" });
  }
  if (input.incompleteReceiptCount > 0) {
    blockers.push({ code: "receipt_incomplete", severity: "warning", count: input.incompleteReceiptCount });
  }

  if (input.paid) {
    return { ...base, status: "ingediend", blockers: [] };
  }

  if (!input.yearEnded) {
    // Lopend jaar: alleen een voorlopige projectie mogelijk.
    return {
      ...base,
      status: "onvolledig",
      blockers: [{ code: "period_open", severity: "blocking" }, ...blockers],
      nextAction: "wachten",
    };
  }

  // Afgesloten jaar: blokkerende problemen → onvolledig, anders klaar. In beide
  // gevallen is de volgende stap het controleren van de cijfers vóór indienen.
  return {
    ...base,
    status: hasBlocking(blockers) ? "onvolledig" : "klaar",
    blockers,
    nextAction: "controleren",
  };
}

// ─── Jaarrekening (per jaar) ───

export interface JaarrekeningFilingInput {
  year: number;
  yearEnded: boolean;
  hasActivity: boolean;
  /** Balanstotaal activa ≈ passiva (binnen tolerantie)? */
  balanceBalances: boolean;
  incompleteReceiptCount: number;
}

export function assessJaarrekeningFiling(input: JaarrekeningFilingInput): FilingReadiness {
  const base = {
    kind: "jaarrekening" as const,
    period: String(input.year),
  };

  if (!input.hasActivity && !input.yearEnded) {
    return { ...base, status: "niet_van_toepassing", blockers: [] };
  }

  const blockers: FilingBlocker[] = [];
  if (!input.balanceBalances) {
    blockers.push({ code: "balance_mismatch", severity: "blocking" });
  }
  if (input.incompleteReceiptCount > 0) {
    blockers.push({ code: "receipt_incomplete", severity: "warning", count: input.incompleteReceiptCount });
  }

  // Een jaarrekening is altijd te genereren (ook voorlopig); blokkerende
  // problemen vragen eerst aandacht.
  if (hasBlocking(blockers)) {
    return { ...base, status: "onvolledig", blockers, nextAction: "controleren" };
  }

  return {
    ...base,
    status: input.yearEnded ? "klaar" : "onvolledig",
    blockers,
    nextAction: "genereren",
  };
}
