/**
 * Reconciliatie: de event-projectie moet exact overeenkomen met de canonieke
 * BTW-engine. Dit is het bewijs onder routekaart stap 2 — pas als beide het
 * eens zijn, mogen projecties de waarheid worden.
 */
import { describe, it, expect } from "vitest";
import { deriveFiscalEvents } from "./derive-events";
import { projectFiscalState } from "./fiscal-events";
import { calculateBtwRubrieken } from "@/lib/tax/btw-rubrieken";

// Standaard binnenlandse facturen (geen regels, geen verlegging) zodat de
// opgeslagen vat_amount exact gelijk is aan wat de rubriek-engine attribueert.
const invoices = [
  { id: "i1", issue_date: "2026-01-15", subtotal_ex_vat: 1000, vat_amount: 210, vat_rate: 21, vat_scheme: "standard", is_credit_note: false },
  { id: "i2", issue_date: "2026-02-20", subtotal_ex_vat: 500, vat_amount: 45, vat_rate: 9, vat_scheme: "standard", is_credit_note: false },
];
const receipts = [
  { id: "r1", receipt_date: "2026-01-20", amount_ex_vat: 200, vat_amount: 42, business_percentage: 100 },
  { id: "r2", receipt_date: "2026-02-10", amount_ex_vat: 100, vat_amount: 21, business_percentage: 50 },
];

describe("event-projectie ⇄ canonieke BTW-engine", () => {
  it("output-BTW, voorbelasting en verschuldigde BTW komen exact overeen", () => {
    const rubrieken = calculateBtwRubrieken(invoices, receipts);
    const events = deriveFiscalEvents({ invoices, receipts });
    const pos = projectFiscalState(events);

    expect(pos.outputBtw).toBe(rubrieken.totaalBtw);
    expect(pos.inputBtw).toBe(rubrieken.voorbelasting);
    // Zonder afdracht is verschuldigd == 5g (op centniveau).
    expect(pos.btwVerschuldigd).toBe(rubrieken.rubriek5g);
  });

  it("een geboekte afdracht verlaagt de verschuldigde BTW even hard", () => {
    const rubrieken = calculateBtwRubrieken(invoices, receipts);
    const events = deriveFiscalEvents({
      invoices,
      receipts,
      taxPayments: [{ kind: "btw", amount: 50, date: "2026-05-01" }],
    });
    const pos = projectFiscalState(events);

    expect(pos.btwAfgedragen).toBe(50);
    expect(pos.btwVerschuldigd).toBe(Math.round((rubrieken.rubriek5g - 50) * 100) / 100);
  });

  it("omzet en kosten reconciliëren met de bron", () => {
    const events = deriveFiscalEvents({ invoices, receipts });
    const pos = projectFiscalState(events);
    expect(pos.omzetExVat).toBe(1500);
    // kosten gewogen: 200 + 50 = 250
    expect(pos.kostenExVat).toBe(250);
  });
});
