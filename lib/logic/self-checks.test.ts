import { describe, it, expect } from "vitest";
import {
  runSelfChecks,
  countAutoFixable,
  highestSeverity,
  invariantsHold,
  type SelfCheckInput,
} from "./self-checks";

const empty: SelfCheckInput = {
  today: "2026-06-09",
  invoices: [],
  receipts: [],
  transactions: [],
  vat: null,
  reserve: null,
};

function invoice(over: Partial<SelfCheckInput["invoices"][number]> = {}) {
  return {
    id: "inv-1",
    status: "sent" as const,
    due_date: null,
    total_inc_vat: 1000,
    vat_scheme: "standard" as const,
    client_btw_number: null,
    matched_tx: false,
    ...over,
  };
}

describe("runSelfChecks", () => {
  it("geeft niets terug op een schone administratie", () => {
    expect(runSelfChecks(empty)).toEqual([]);
  });

  it("markeert een verstreken factuur als auto-corrigeerbaar overdue", () => {
    const findings = runSelfChecks({
      ...empty,
      invoices: [invoice({ due_date: "2026-05-01" })],
    });
    const f = findings.find((x) => x.kind === "overdue_not_flagged");
    expect(f).toBeDefined();
    expect(f?.autoFixable).toBe(true);
    expect(f?.entityId).toBe("inv-1");
  });

  it("stelt een match voor tussen een losse betaling en een openstaande factuur", () => {
    const findings = runSelfChecks({
      ...empty,
      invoices: [invoice({ id: "inv-9", total_inc_vat: 1210 })],
      transactions: [
        { id: "tx-1", amount: 1210, is_income: true, linked_invoice_id: null },
      ],
    });
    const f = findings.find((x) => x.kind === "payment_unmatched");
    expect(f?.entityId).toBe("tx-1");
    expect(f?.relatedId).toBe("inv-9");
    expect(f?.autoFixable).toBe(true);
  });

  it("ziet een EU-levering zonder BTW-nummer als kritiek", () => {
    const findings = runSelfChecks({
      ...empty,
      invoices: [invoice({ vat_scheme: "eu_reverse_charge", client_btw_number: null })],
    });
    const f = findings.find((x) => x.kind === "eu_reverse_charge_no_vat_number");
    expect(f?.severity).toBe("critical");
    expect(f?.autoFixable).toBe(false);
  });

  it("herkent onvolledige en dubbele bonnen", () => {
    const findings = runSelfChecks({
      ...empty,
      receipts: [
        { id: "r1", amount_ex_vat: null, vat_rate: 21, vendor_name: "Coolblue", receipt_date: "2026-06-01" },
        { id: "r2", amount_ex_vat: 50, vat_rate: 21, vendor_name: "Coolblue", receipt_date: "2026-06-02" },
        { id: "r3", amount_ex_vat: 50, vat_rate: 21, vendor_name: "Coolblue", receipt_date: "2026-06-02" },
      ],
    });
    expect(findings.some((f) => f.kind === "receipt_incomplete" && f.entityId === "r1")).toBe(true);
    const dup = findings.find((f) => f.kind === "duplicate_receipt");
    expect(dup?.entityId).toBe("r3");
    expect(dup?.relatedId).toBe("r2");
  });

  it("waarschuwt voor een onvoorbereide aangifte binnen het venster", () => {
    const near = runSelfChecks({
      ...empty,
      vat: { daysRemaining: 7, estimatedAmount: 800, preparedForQuarter: false },
    });
    expect(near.some((f) => f.kind === "vat_return_due_unprepared")).toBe(true);

    const prepared = runSelfChecks({
      ...empty,
      vat: { daysRemaining: 7, estimatedAmount: 800, preparedForQuarter: true },
    });
    expect(prepared.some((f) => f.kind === "vat_return_due_unprepared")).toBe(false);
  });

  it("stelt een vaste regel voor bij een herhaald, eensluidend gecorrigeerd patroon", () => {
    const findings = runSelfChecks({
      ...empty,
      corrections: [
        { pattern: "Coolblue", value: "Computer & software" },
        { pattern: "coolblue", value: "Computer & software" },
        { pattern: "CoolBlue", value: "Computer & software" },
      ],
    });
    const f = findings.find((x) => x.kind === "repeated_correction");
    expect(f).toBeDefined();
    expect(f?.autoFixable).toBe(true);
    expect(f?.count).toBe(3);
    expect(f?.label).toContain("coolblue");
  });

  it("stelt géén regel voor bij te weinig of conflicterende correcties", () => {
    const tooFew = runSelfChecks({
      ...empty,
      corrections: [
        { pattern: "Shell", value: "Vervoer" },
        { pattern: "Shell", value: "Vervoer" },
      ],
    });
    expect(tooFew.some((f) => f.kind === "repeated_correction")).toBe(false);

    const conflicted = runSelfChecks({
      ...empty,
      corrections: [
        { pattern: "X", value: "A" },
        { pattern: "X", value: "A" },
        { pattern: "X", value: "B" },
        { pattern: "X", value: "B" },
      ],
    });
    expect(conflicted.some((f) => f.kind === "repeated_correction")).toBe(false);
  });

  it("waarschuwt bij een reserve-tekort", () => {
    const findings = runSelfChecks({
      ...empty,
      reserve: { reservedTotal: 5000, currentBalance: 3000 },
    });
    const f = findings.find((x) => x.kind === "reserve_shortfall");
    expect(f?.amount).toBe(2000);
  });

  it("sorteert kritiek vóór waarschuwing vóór info", () => {
    const findings = runSelfChecks({
      ...empty,
      invoices: [
        invoice({ id: "a", due_date: "2026-05-01" }), // warning
        invoice({ id: "b", vat_scheme: "eu_reverse_charge", client_btw_number: "" }), // critical
        invoice({ id: "c", status: "paid", matched_tx: false }), // info
      ],
    });
    expect(findings[0].severity).toBe("critical");
    expect(highestSeverity(findings)).toBe("critical");
    expect(countAutoFixable(findings)).toBeGreaterThanOrEqual(1);
  });

  it("invariantsHold: false bij een kritieke bevinding, anders true", () => {
    const schoon = runSelfChecks(empty);
    expect(invariantsHold(schoon)).toBe(true);

    const kritiek = runSelfChecks({
      ...empty,
      invoices: [invoice({ vat_scheme: "eu_reverse_charge", client_btw_number: "" })],
    });
    expect(invariantsHold(kritiek)).toBe(false);

    const alleenWaarschuwing = runSelfChecks({
      ...empty,
      invoices: [invoice({ due_date: "2026-05-01" })],
    });
    expect(invariantsHold(alleenWaarschuwing)).toBe(true);
  });
});
