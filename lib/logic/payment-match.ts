/**
 * Betaling ⇄ factuur — de pure matcher die confidence levert voor de poort.
 *
 * Een binnenkomende banktransactie koppelen aan een openstaande factuur is een
 * zekerheids-beslissing: één factuur met exact dit bedrag = zeker; bedrag +
 * naam = zeker genoeg; alleen een factuurnummer in de omschrijving = zeker;
 * meerdere kandidaten met hetzelfde bedrag = niet te kiezen (laat de mens).
 *
 * Die confidence gaat door de veiligheidspoort (`match_payment_to_invoice` =
 * Tier 1, omkeerbaar): hoog → autonoom als betaald markeren, anders voorleggen.
 * Puur en deterministisch — geen DB/IO.
 */

import {
  defineAction,
  decideAction,
  type AgentAction,
  type DispatchContext,
  type DispatchResult,
} from "@/lib/autonomy/dispatcher";

/** Tolerantie (in euro's) waarmee een bedrag als "gelijk" telt. */
export const AMOUNT_MATCH_TOLERANCE = 0.02;

export const CONFIDENCE_AMOUNT_ONLY = 0.9;
export const CONFIDENCE_AMOUNT_AND_NAME = 0.98;
export const CONFIDENCE_REFERENCE = 0.95;

export interface OpenInvoiceForMatch {
  id: string;
  total_inc_vat: number;
  client_name?: string | null;
  invoice_number?: string | null;
}

export interface IncomingPayment {
  amount: number;
  counterpartName?: string | null;
  description?: string | null;
}

export interface PaymentMatch {
  invoiceId: string;
  confidence: number;
  reasons: string[];
}

function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

/**
 * Vindt de beste factuur-match voor een binnenkomende betaling, of `null` als
 * er geen verantwoorde keuze is (geen kandidaat, of meerdere niet te
 * onderscheiden kandidaten).
 */
export function matchPayment(
  payment: IncomingPayment,
  openInvoices: OpenInvoiceForMatch[],
): PaymentMatch | null {
  const amount = payment.amount;
  if (!(amount > 0)) return null;

  const haystack = `${norm(payment.description)} ${norm(payment.counterpartName)}`;

  // 1. Referentie: factuurnummer (≥3 tekens) in de omschrijving → sterk signaal.
  for (const inv of openInvoices) {
    const ref = norm(inv.invoice_number);
    if (ref.length >= 3 && haystack.includes(ref)) {
      return { invoiceId: inv.id, confidence: CONFIDENCE_REFERENCE, reasons: ["factuurnummer in omschrijving"] };
    }
  }

  // 2. Bedrag-match (binnen tolerantie).
  const amountMatches = openInvoices.filter(
    (inv) => Math.abs((Number(inv.total_inc_vat) || 0) - amount) <= AMOUNT_MATCH_TOLERANCE,
  );

  if (amountMatches.length === 1) {
    const inv = amountMatches[0];
    const name = norm(inv.client_name);
    if (name.length >= 3 && haystack.includes(name)) {
      return { invoiceId: inv.id, confidence: CONFIDENCE_AMOUNT_AND_NAME, reasons: ["exact bedrag", "klantnaam komt overeen"] };
    }
    return { invoiceId: inv.id, confidence: CONFIDENCE_AMOUNT_ONLY, reasons: ["exact bedrag"] };
  }

  if (amountMatches.length > 1) {
    // Meerdere facturen met hetzelfde bedrag: probeer te onderscheiden op naam.
    const byName = amountMatches.filter((inv) => {
      const name = norm(inv.client_name);
      return name.length >= 3 && haystack.includes(name);
    });
    if (byName.length === 1) {
      return { invoiceId: byName[0].id, confidence: CONFIDENCE_AMOUNT_AND_NAME, reasons: ["exact bedrag", "klantnaam onderscheidt"] };
    }
    // Niet verantwoord te kiezen → laat de mens beslissen.
    return null;
  }

  return null;
}

export interface PaymentMatchDecision {
  match: PaymentMatch;
  action: AgentAction;
  decision: DispatchResult;
}

/**
 * Matcht én haalt het besluit door de veiligheidspoort
 * (`match_payment_to_invoice` = Tier 1). Geen verantwoorde match → null.
 */
export function decidePaymentMatch(
  payment: IncomingPayment,
  openInvoices: OpenInvoiceForMatch[],
  ctx: DispatchContext,
): PaymentMatchDecision | null {
  const match = matchPayment(payment, openInvoices);
  if (!match) return null;

  const action = defineAction("match_payment_to_invoice", {
    confidence: match.confidence,
    evidence: match.reasons,
    summary: `Koppel betaling aan factuur ${match.invoiceId}`,
    targetId: match.invoiceId,
  });

  return { match, action, decision: decideAction(action, ctx) };
}
