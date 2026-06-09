/**
 * De controle-laag — het brein van een zelf-controlerend, zelf-corrigerend VAT100.
 *
 * Eén pure, deterministische functie die invarianten over de administratie
 * valideert en een lijst bevindingen teruggeeft. Geen DB-, server- of
 * AI-afhankelijkheden: zo is het uitkomst-voorspelbaar, testbaar en draait het
 * overal hetzelfde (cron, server action, of in een admin-controletoren).
 *
 * Elke bevinding draagt genoeg structuur om twee dingen te voeden:
 *  1. De gebruiker — één rustige kaart in "Nu doen" (alleen bij twijfel/risico).
 *  2. Auto-correctie — `autoFixable` markeert wat veilig automatisch kan.
 *
 * De berekening kent de waarheid, niet de presentatie: teksten worden in de
 * UI gelokaliseerd op basis van `kind` + payload.
 */

import type { InvoiceStatus, VatScheme } from "@/lib/types";
import { consolidateCorrections, type Correction } from "@/lib/autonomy/learning";

export type ControlSeverity = "info" | "warning" | "critical";

export type ControlKind =
  | "overdue_not_flagged" // verstuurd, over vervaldatum, nog niet 'overdue'
  | "payment_unmatched" // inkomende transactie matcht een openstaande factuur
  | "invoice_paid_no_tx" // factuur 'paid' maar geen gekoppelde banktransactie
  | "eu_reverse_charge_no_vat_number" // EU verlegd zonder BTW-nummer (ICP-risico)
  | "receipt_incomplete" // bon zonder bedrag of BTW-tarief
  | "duplicate_receipt" // mogelijke dubbele bon
  | "vat_return_due_unprepared" // deadline nabij, aangifte nog niet voorbereid
  | "reserve_shortfall" // reserve is groter dan het saldo
  | "repeated_correction"; // patroon herhaald gecorrigeerd → maak er een vaste regel van

export interface ControlFinding {
  kind: ControlKind;
  severity: ControlSeverity;
  /** Kan dit veilig automatisch worden gecorrigeerd? */
  autoFixable: boolean;
  /** Hoofd-entiteit (factuur/bon/transactie) waarop de bevinding slaat. */
  entityId?: string;
  /** Gekoppelde entiteit (bv. de factuur bij een transactie-match). */
  relatedId?: string;
  amount?: number;
  count?: number;
  /** Mensleesbare context, bv. het patroon bij een herhaalde correctie. */
  label?: string;
}

export interface SelfCheckInvoice {
  id: string;
  status: InvoiceStatus;
  due_date: string | null;
  total_inc_vat: number;
  vat_scheme: VatScheme;
  client_btw_number: string | null;
  /** Is er een banktransactie aan deze factuur gekoppeld? */
  matched_tx: boolean;
}

export interface SelfCheckReceipt {
  id: string;
  amount_ex_vat: number | null;
  vat_rate: number | null;
  vendor_name: string | null;
  receipt_date: string | null;
}

export interface SelfCheckTransaction {
  id: string;
  amount: number;
  is_income: boolean;
  linked_invoice_id: string | null;
}

export interface SelfCheckInput {
  /** Peildatum (ISO, YYYY-MM-DD). */
  today: string;
  invoices: SelfCheckInvoice[];
  receipts: SelfCheckReceipt[];
  transactions: SelfCheckTransaction[];
  vat?: {
    daysRemaining: number;
    estimatedAmount: number;
    preparedForQuarter: boolean;
  } | null;
  reserve?: {
    reservedTotal: number;
    currentBalance: number;
  } | null;
  /** Bevestigde correcties (tegenpartij/leverancier → uitkomst) om op te leren. */
  corrections?: Correction[];
}

/** Binnen hoeveel dagen een onvoorbereide aangifte een waarschuwing wordt. */
export const VAT_PREPARE_WINDOW_DAYS = 14;

/** Tolerantie (in euro's) waarmee een transactie een factuur mag matchen. */
export const PAYMENT_MATCH_TOLERANCE = 0.02;

/** Vanaf hoeveel eensluidende correcties een vaste regel wordt voorgesteld. */
export const REPEATED_CORRECTION_THRESHOLD = 3;

const SEVERITY_RANK: Record<ControlSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function isBefore(dateA: string, dateB: string): boolean {
  return new Date(dateA).getTime() < new Date(dateB).getTime();
}

/**
 * Voert alle controles uit en geeft de bevindingen terug, gesorteerd op
 * ernst (kritiek eerst). Puur: dezelfde input geeft altijd dezelfde output.
 */
export function runSelfChecks(input: SelfCheckInput): ControlFinding[] {
  const findings: ControlFinding[] = [];
  const openInvoices = input.invoices.filter(
    (i) => i.status === "sent" || i.status === "overdue",
  );

  // 1. Verstuurde factuur over de vervaldatum, nog niet als 'overdue' gemarkeerd.
  for (const inv of input.invoices) {
    if (inv.status === "sent" && inv.due_date && isBefore(inv.due_date, input.today)) {
      findings.push({
        kind: "overdue_not_flagged",
        severity: "warning",
        autoFixable: true,
        entityId: inv.id,
        amount: inv.total_inc_vat,
      });
    }
  }

  // 2. Inkomende transactie zonder koppeling die exact een openstaande factuur dekt.
  for (const tx of input.transactions) {
    if (!tx.is_income || tx.linked_invoice_id) continue;
    const match = openInvoices.find(
      (inv) => Math.abs(inv.total_inc_vat - tx.amount) <= PAYMENT_MATCH_TOLERANCE,
    );
    if (match) {
      findings.push({
        kind: "payment_unmatched",
        severity: "info",
        autoFixable: true,
        entityId: tx.id,
        relatedId: match.id,
        amount: tx.amount,
      });
    }
  }

  // 3. Factuur 'paid' maar geen gekoppelde banktransactie (niet auto-fixbaar).
  for (const inv of input.invoices) {
    if (inv.status === "paid" && !inv.matched_tx) {
      findings.push({
        kind: "invoice_paid_no_tx",
        severity: "info",
        autoFixable: false,
        entityId: inv.id,
        amount: inv.total_inc_vat,
      });
    }
  }

  // 4. EU-levering met BTW verlegd, maar geen BTW-nummer → ICP/aangifte-risico.
  for (const inv of input.invoices) {
    if (
      inv.vat_scheme === "eu_reverse_charge" &&
      (!inv.client_btw_number || inv.client_btw_number.trim() === "")
    ) {
      findings.push({
        kind: "eu_reverse_charge_no_vat_number",
        severity: "critical",
        autoFixable: false,
        entityId: inv.id,
        amount: inv.total_inc_vat,
      });
    }
  }

  // 5. Onvolledige bon (geen bedrag of geen BTW-tarief).
  for (const r of input.receipts) {
    if (r.amount_ex_vat == null || r.vat_rate == null) {
      findings.push({
        kind: "receipt_incomplete",
        severity: "warning",
        autoFixable: false,
        entityId: r.id,
      });
    }
  }

  // 6. Mogelijke dubbele bon (zelfde leverancier + bedrag + datum).
  const seen = new Map<string, string>();
  for (const r of input.receipts) {
    if (r.amount_ex_vat == null || !r.vendor_name || !r.receipt_date) continue;
    const key = `${r.vendor_name.trim().toLowerCase()}|${r.amount_ex_vat}|${r.receipt_date}`;
    const firstId = seen.get(key);
    if (firstId) {
      findings.push({
        kind: "duplicate_receipt",
        severity: "warning",
        autoFixable: false,
        entityId: r.id,
        relatedId: firstId,
        amount: r.amount_ex_vat,
      });
    } else {
      seen.set(key, r.id);
    }
  }

  // 7. BTW-aangifte deadline nabij en nog niet voorbereid.
  if (
    input.vat &&
    input.vat.estimatedAmount > 0 &&
    input.vat.daysRemaining <= VAT_PREPARE_WINDOW_DAYS &&
    !input.vat.preparedForQuarter
  ) {
    findings.push({
      kind: "vat_return_due_unprepared",
      severity: "warning",
      autoFixable: true,
      amount: input.vat.estimatedAmount,
      count: Math.max(0, input.vat.daysRemaining),
    });
  }

  // 8. Reservering groter dan het saldo → je houdt te weinig opzij.
  if (
    input.reserve &&
    input.reserve.currentBalance > 0 &&
    input.reserve.reservedTotal > input.reserve.currentBalance
  ) {
    findings.push({
      kind: "reserve_shortfall",
      severity: "warning",
      autoFixable: false,
      amount:
        Math.round((input.reserve.reservedTotal - input.reserve.currentBalance) * 100) / 100,
    });
  }

  // 9. Zelf-verbetering: een patroon dat je telkens eensluidend corrigeert,
  // mag een vaste regel worden (auto-fixbaar: de regel kan autonoom worden
  // vastgelegd). Conflicterende correcties tellen niet — die vragen aandacht.
  if (input.corrections && input.corrections.length > 0) {
    for (const c of consolidateCorrections(input.corrections)) {
      if (!c.conflicted && c.strength >= REPEATED_CORRECTION_THRESHOLD) {
        findings.push({
          kind: "repeated_correction",
          severity: "info",
          autoFixable: true,
          label: `${c.pattern} → ${c.value}`,
          count: c.strength,
        });
      }
    }
  }

  return findings.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

/** Aantal bevindingen dat veilig automatisch te corrigeren is. */
export function countAutoFixable(findings: ControlFinding[]): number {
  return findings.filter((f) => f.autoFixable).length;
}

/** Hoogste ernst in een set bevindingen (voor een statuslampje). */
export function highestSeverity(findings: ControlFinding[]): ControlSeverity | null {
  if (findings.length === 0) return null;
  return findings.reduce<ControlSeverity>((worst, f) => {
    return SEVERITY_RANK[f.severity] < SEVERITY_RANK[worst] ? f.severity : worst;
  }, "info");
}
