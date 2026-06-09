/**
 * Autonomie-kernel — de poort waardoor élke geautomatiseerde actie gaat.
 *
 * Het veiligheidsmodel uit ARCHITECTURE.md, hier afgedwongen in code:
 * autonomie schaalt omgekeerd met blast-radius. Een actie wordt geclassificeerd
 * met een **tier**; de dispatcher beslist deterministisch of die actie autonoom
 * mag (`execute`), aan de mens wordt voorgelegd (`propose`), of geblokkeerd
 * wordt (`block`).
 *
 *   Tier 0  Alleen lezen/afleiden, geen side-effect      → altijd autonoom
 *   Tier 1  Omkeerbare interne staat                     → autonoom bij zekerheid, gelogd, undo
 *   Tier 2  Naar buiten, herstelbaar                     → alleen bij hoge zekerheid, anders voorstel
 *   Tier 3  Onomkeerbaar / hoge inzet                    → nóóit autonoom; mens bevestigt
 *
 * Vangrails: de controle-laag (`runSelfChecks`) levert `invariantsOk`; breekt
 * een invariant, dan wordt elke muterende actie geblokkeerd. Een noodstop
 * (`autonomyEnabled=false`) en een schaduwmodus (`shadowMode`) degraderen alles
 * veilig naar "voorstel". Onbekende acties vallen terug op de veiligste tier (3).
 *
 * Puur en deterministisch: geen DB/AI/IO. De caller verzamelt de feiten en voert
 * pas uit ná een `execute`-besluit — en logt altijd (wie/wat/waarom/wanneer).
 */

export type AutonomyTier = 0 | 1 | 2 | 3;

export type AutonomyDecision = "execute" | "propose" | "block";

export interface AgentAction {
  /** Stabiele soort-aanduiding, bv. "mark_invoice_overdue". */
  kind: string;
  /** Blast-radius-tier (uit {@link ACTION_TIERS} via {@link defineAction}). */
  tier: AutonomyTier;
  /** Zekerheid 0..1 (deterministisch waar mogelijk, anders AI-score). */
  confidence: number;
  /** Waarom het systeem dit voorstelt — voor het audit-spoor en de mens. */
  evidence: string[];
  /** Mensleesbare samenvatting van de actie. */
  summary: string;
  /** Entiteit waarop de actie slaat (factuur/transactie/...). */
  targetId?: string;
}

export interface DispatchContext {
  /** Globale noodstop. Uit → geen muterende autonomie. */
  autonomyEnabled: boolean;
  /** Controle-laag groen? (geen blokkerende bevindingen vóór/na de actie) */
  invariantsOk: boolean;
  /** Schaduwmodus: zou uitvoeren, maar legt alleen vast (verificatie vooraf). */
  shadowMode?: boolean;
}

export interface DispatchResult {
  decision: AutonomyDecision;
  reason: string;
}

/** Minimale zekerheid voor autonome uitvoering per tier. */
export const TIER1_MIN_CONFIDENCE = 0.6;
export const TIER2_MIN_CONFIDENCE = 0.9;

/**
 * Beleid: welke actie-soort hoort bij welke tier. De enige plek waar dat
 * wordt vastgelegd, zodat callers geen tier kunnen "raden".
 */
export const ACTION_TIERS: Record<string, AutonomyTier> = {
  // Tier 0 — lezen/afleiden
  recompute_reserve: 0,
  run_self_checks: 0,
  refresh_projection: 0,

  // Tier 1 — omkeerbare interne staat
  mark_invoice_overdue: 1,
  match_payment_to_invoice: 1,
  prepare_vat_return: 1,
  categorize_transaction: 1,

  // Tier 2 — naar buiten, herstelbaar
  send_payment_reminder: 2,

  // Tier 3 — onomkeerbaar / hoge inzet
  submit_vat_return: 3,
  send_invoice: 3,
  record_tax_payment: 3,
  charge_subscription: 3,
};

/** Tier voor een soort; onbekend → veiligste tier (3, mens bevestigt). */
export function tierFor(kind: string): AutonomyTier {
  return ACTION_TIERS[kind] ?? 3;
}

/** Bouwt een {@link AgentAction} met de tier uit het beleid. */
export function defineAction(
  kind: string,
  input: { confidence: number; evidence: string[]; summary: string; targetId?: string },
): AgentAction {
  return {
    kind,
    tier: tierFor(kind),
    confidence: clamp01(input.confidence),
    evidence: input.evidence,
    summary: input.summary,
    targetId: input.targetId,
  };
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function minConfidenceFor(tier: AutonomyTier): number {
  return tier === 2 ? TIER2_MIN_CONFIDENCE : TIER1_MIN_CONFIDENCE;
}

/**
 * Het besluit: mag deze actie autonoom, of moet de mens hem zien?
 *
 * Volgorde van de poorten (van hard naar zacht):
 *  1. Tier 0 (geen side-effect)        → altijd execute
 *  2. Invarianten kapot                → block (alleen muterende acties)
 *  3. Tier 3 (onomkeerbaar)            → propose (mens)
 *  4. Noodstop uit                     → propose
 *  5. Schaduwmodus                     → propose (zou uitvoeren, vastgelegd)
 *  6. Zekerheid ≥ drempel?             → execute, anders propose
 */
export function decideAction(action: AgentAction, ctx: DispatchContext): DispatchResult {
  // 1. Alleen-lezen acties zijn altijd veilig.
  if (action.tier === 0) {
    return { decision: "execute", reason: "Alleen-lezen/afleiden — geen side-effect" };
  }

  // 2. Vangrail: bij een gebroken invariant nooit muteren.
  if (!ctx.invariantsOk) {
    return { decision: "block", reason: "Controle-invariant zou breken — geblokkeerd" };
  }

  // 3. Onomkeerbare acties blijven altijd bij de mens.
  if (action.tier === 3) {
    return { decision: "propose", reason: "Onomkeerbaar — vereist menselijke bevestiging" };
  }

  // 4. Noodstop.
  if (!ctx.autonomyEnabled) {
    return { decision: "propose", reason: "Autonomie staat uit (noodstop)" };
  }

  const min = minConfidenceFor(action.tier);
  const wouldExecute = action.confidence >= min;

  // 5. Schaduwmodus: leg vast wat het zou doen, voer niets uit.
  if (ctx.shadowMode) {
    return {
      decision: "propose",
      reason: wouldExecute
        ? "Schaduwmodus — zou autonoom uitvoeren, alleen vastgelegd"
        : `Te onzeker (< ${min}) — voorgelegd aan de mens`,
    };
  }

  // 6. Zekerheidspoort.
  return wouldExecute
    ? { decision: "execute", reason: `Voldoende zekerheid (≥ ${min}) voor tier ${action.tier}` }
    : { decision: "propose", reason: `Te onzeker (< ${min}) — voorgelegd aan de mens` };
}
