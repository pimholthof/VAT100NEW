import { describe, it, expect } from "vitest";
import { deriveNextActions, MAX_NEXT_ACTIONS } from "./next-actions";

const base = {
  overdueCount: 0,
  overdueAmount: 0,
  collectCount: 0,
  collectAmount: 0,
  hasAnyInvoice: true,
  vat: null,
};

describe("deriveNextActions", () => {
  it("toont 'alles loopt' wanneer er niets te doen is", () => {
    const actions = deriveNextActions(base);
    expect(actions).toHaveLength(1);
    expect(actions[0].kind).toBe("allClear");
    expect(actions[0].tone).toBe("done");
  });

  it("zet te laat betaalde facturen bovenaan", () => {
    const actions = deriveNextActions({
      ...base,
      overdueCount: 2,
      overdueAmount: 1500,
      collectCount: 3,
      collectAmount: 4000,
    });
    expect(actions[0].kind).toBe("overdue");
    expect(actions[0].tone).toBe("urgent");
    expect(actions[0].amount).toBe(1500);
  });

  it("toont de BTW-aangifte alleen binnen het venster én met een bedrag", () => {
    const within = deriveNextActions({
      ...base,
      vat: { quarter: "Q2 2026", daysRemaining: 12, amount: 800 },
    });
    expect(within.some((a) => a.kind === "vat")).toBe(true);

    const tooFar = deriveNextActions({
      ...base,
      vat: { quarter: "Q3 2026", daysRemaining: 80, amount: 800 },
    });
    expect(tooFar.some((a) => a.kind === "vat")).toBe(false);

    const nothingDue = deriveNextActions({
      ...base,
      vat: { quarter: "Q2 2026", daysRemaining: 12, amount: 0 },
    });
    expect(nothingDue.some((a) => a.kind === "vat")).toBe(false);
  });

  it("nodigt nieuwe gebruikers uit hun eerste factuur te sturen", () => {
    const actions = deriveNextActions({ ...base, hasAnyInvoice: false });
    expect(actions.some((a) => a.kind === "firstInvoice")).toBe(true);
  });

  it("respecteert de juiste prioriteitsvolgorde", () => {
    const actions = deriveNextActions({
      overdueCount: 1,
      overdueAmount: 500,
      collectCount: 2,
      collectAmount: 2000,
      hasAnyInvoice: true,
      vat: { quarter: "Q2 2026", daysRemaining: 5, amount: 900 },
    });
    expect(actions.map((a) => a.kind)).toEqual(["overdue", "vat", "collect"]);
  });

  it("toont nooit meer dan het maximum aantal acties", () => {
    const actions = deriveNextActions({
      overdueCount: 1,
      overdueAmount: 500,
      collectCount: 2,
      collectAmount: 2000,
      hasAnyInvoice: false,
      vat: { quarter: "Q2 2026", daysRemaining: 5, amount: 900 },
    });
    expect(actions.length).toBeLessThanOrEqual(MAX_NEXT_ACTIONS);
  });
});
