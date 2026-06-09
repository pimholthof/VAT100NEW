/**
 * Event-sourced fiscale kern — de "het grootboek is een projectie"-steen.
 *
 * De revolutie (zie docs/revolutie-architectuur.md): je administratie is geen
 * ding dat je bijwerkt, maar een *projectie* van een onveranderlijke stroom
 * gebeurtenissen waarop je geabonneerd bent (bank, e-facturatie, Belastingdienst).
 *
 * Deze pure module is de seed daarvan: een gebeurtenis-type en een
 * `projectFiscalState` die de stroom vouwt tot de live fiscale positie. Twee
 * superkrachten vallen er gratis uit:
 *   - realtime: nieuwe gebeurtenis → positie herrekend;
 *   - tijdreizen: `asOf` filtert de stroom op een peildatum.
 *
 * Bewust puur en additief: het vervangt (nog) niets, maar zet de richting in
 * code. De bestaande projecties (Drie Potten, BTW-aangifte) worden hier later
 * views overheen.
 */

import { roundMoney } from "@/lib/logic/invoice-calculations";

interface BaseEvent {
  /** ISO-tijdstip waarop de gebeurtenis plaatsvond. */
  at: string;
}

export interface InvoiceIssued extends BaseEvent {
  type: "invoice.issued";
  invoiceId: string;
  /** Omzet ex. BTW. */
  netExVat: number;
  /** Verschuldigde (output) BTW. */
  vat: number;
}

export interface PaymentReceived extends BaseEvent {
  type: "payment.received";
  invoiceId: string;
  /** Wat er daadwerkelijk binnenkwam (incl. BTW). */
  amount: number;
}

export interface ExpenseCaptured extends BaseEvent {
  type: "expense.captured";
  expenseId: string;
  netExVat: number;
  /** Voorbelasting vóór weging. */
  vat: number;
  /** Zakelijk percentage 0..100. */
  businessPct: number;
}

export interface TaxPaid extends BaseEvent {
  type: "tax.paid";
  taxKind: "btw" | "ib";
  amount: number;
}

export type FiscalEvent =
  | InvoiceIssued
  | PaymentReceived
  | ExpenseCaptured
  | TaxPaid;

export interface FiscalPosition {
  /** Gefactureerde omzet (ex. BTW). */
  omzetExVat: number;
  /** Daadwerkelijk ontvangen (incl. BTW). */
  ontvangenInclVat: number;
  /** Zakelijke kosten (ex. BTW), gewogen naar zakelijk %. */
  kostenExVat: number;
  /** Output-BTW op gefactureerde omzet. */
  outputBtw: number;
  /** Voorbelasting (gewogen naar zakelijk %). */
  inputBtw: number;
  /** Reeds afgedragen BTW. */
  btwAfgedragen: number;
  /** Reeds betaalde IB. */
  ibBetaald: number;
  /** Nog verschuldigde BTW: output − input − reeds afgedragen. */
  btwVerschuldigd: number;
}

const ZERO: FiscalPosition = {
  omzetExVat: 0,
  ontvangenInclVat: 0,
  kostenExVat: 0,
  outputBtw: 0,
  inputBtw: 0,
  btwAfgedragen: 0,
  ibBetaald: 0,
  btwVerschuldigd: 0,
};

/**
 * Vouwt de gebeurtenisstroom tot de live fiscale positie.
 *
 * @param events De (onveranderlijke) stroom.
 * @param opts.asOf Optionele peildatum (ISO) — alleen gebeurtenissen t/m dat
 *   moment tellen mee. Zo reis je terug in de tijd.
 */
export function projectFiscalState(
  events: FiscalEvent[],
  opts: { asOf?: string } = {},
): FiscalPosition {
  const cutoff = opts.asOf ? new Date(opts.asOf).getTime() : Infinity;

  const acc = { ...ZERO };

  for (const e of events) {
    if (new Date(e.at).getTime() > cutoff) continue;

    switch (e.type) {
      case "invoice.issued":
        acc.omzetExVat += e.netExVat;
        acc.outputBtw += e.vat;
        break;
      case "payment.received":
        acc.ontvangenInclVat += e.amount;
        break;
      case "expense.captured": {
        const pct = Math.max(0, Math.min(100, e.businessPct)) / 100;
        acc.kostenExVat += e.netExVat * pct;
        acc.inputBtw += e.vat * pct;
        break;
      }
      case "tax.paid":
        if (e.taxKind === "btw") acc.btwAfgedragen += e.amount;
        else acc.ibBetaald += e.amount;
        break;
    }
  }

  const position: FiscalPosition = {
    omzetExVat: roundMoney(acc.omzetExVat),
    ontvangenInclVat: roundMoney(acc.ontvangenInclVat),
    kostenExVat: roundMoney(acc.kostenExVat),
    outputBtw: roundMoney(acc.outputBtw),
    inputBtw: roundMoney(acc.inputBtw),
    btwAfgedragen: roundMoney(acc.btwAfgedragen),
    ibBetaald: roundMoney(acc.ibBetaald),
    btwVerschuldigd: roundMoney(acc.outputBtw - acc.inputBtw - acc.btwAfgedragen),
  };

  return position;
}
