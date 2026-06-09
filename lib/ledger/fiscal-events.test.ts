import { describe, it, expect } from "vitest";
import { projectFiscalState, type FiscalEvent } from "./fiscal-events";

const stream: FiscalEvent[] = [
  { type: "invoice.issued", at: "2026-01-10", invoiceId: "a", netExVat: 1000, vat: 210 },
  { type: "payment.received", at: "2026-02-01", invoiceId: "a", amount: 1210 },
  { type: "expense.captured", at: "2026-02-15", expenseId: "e1", netExVat: 100, vat: 21, businessPct: 100 },
  { type: "expense.captured", at: "2026-03-01", expenseId: "e2", netExVat: 200, vat: 42, businessPct: 50 },
  { type: "tax.paid", at: "2026-05-01", taxKind: "btw", amount: 50 },
];

describe("projectFiscalState", () => {
  it("vouwt de stroom tot de juiste positie", () => {
    const p = projectFiscalState(stream);
    expect(p.omzetExVat).toBe(1000);
    expect(p.ontvangenInclVat).toBe(1210);
    expect(p.outputBtw).toBe(210);
    // input-BTW gewogen: 21 (100%) + 21 (50% van 42) = 42
    expect(p.inputBtw).toBe(42);
    // kosten gewogen: 100 + 100 (50% van 200) = 200
    expect(p.kostenExVat).toBe(200);
    expect(p.btwAfgedragen).toBe(50);
    // verschuldigd: 210 − 42 − 50 = 118
    expect(p.btwVerschuldigd).toBe(118);
  });

  it("reist terug in de tijd met asOf (latere gebeurtenissen tellen niet)", () => {
    const p = projectFiscalState(stream, { asOf: "2026-02-10" });
    expect(p.omzetExVat).toBe(1000); // factuur 10 jan telt
    expect(p.ontvangenInclVat).toBe(1210); // betaling 1 feb telt
    expect(p.inputBtw).toBe(0); // kosten van 15 feb / 1 mrt nog niet
    expect(p.btwAfgedragen).toBe(0); // afdracht 1 mei nog niet
    expect(p.btwVerschuldigd).toBe(210);
  });

  it("geeft een nulpositie voor een lege stroom", () => {
    const p = projectFiscalState([]);
    expect(p.omzetExVat).toBe(0);
    expect(p.btwVerschuldigd).toBe(0);
  });

  it("is deterministisch: zelfde stroom → zelfde positie", () => {
    expect(projectFiscalState(stream)).toEqual(projectFiscalState(stream));
  });
});
