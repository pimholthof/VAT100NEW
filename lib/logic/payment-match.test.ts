import { describe, it, expect } from "vitest";
import {
  matchPayment,
  decidePaymentMatch,
  CONFIDENCE_AMOUNT_ONLY,
  CONFIDENCE_AMOUNT_AND_NAME,
  CONFIDENCE_REFERENCE,
} from "./payment-match";
import type { DispatchContext } from "@/lib/autonomy/dispatcher";

const ok: DispatchContext = { autonomyEnabled: true, invariantsOk: true };

const invoices = [
  { id: "a", total_inc_vat: 1210, client_name: "Studio Noord", invoice_number: "2026-014" },
  { id: "b", total_inc_vat: 500, client_name: "Bakkerij Jansen", invoice_number: "2026-015" },
];

describe("matchPayment", () => {
  it("matcht één exact bedrag met hoge zekerheid", () => {
    const m = matchPayment({ amount: 1210 }, invoices);
    expect(m?.invoiceId).toBe("a");
    expect(m?.confidence).toBe(CONFIDENCE_AMOUNT_ONLY);
  });

  it("verhoogt de zekerheid als ook de klantnaam matcht", () => {
    const m = matchPayment({ amount: 1210, counterpartName: "Studio Noord BV" }, invoices);
    expect(m?.confidence).toBe(CONFIDENCE_AMOUNT_AND_NAME);
  });

  it("matcht op factuurnummer in de omschrijving (ook bij afwijkend bedrag)", () => {
    const m = matchPayment({ amount: 999, description: "betaling factuur 2026-015" }, invoices);
    expect(m?.invoiceId).toBe("b");
    expect(m?.confidence).toBe(CONFIDENCE_REFERENCE);
  });

  it("kiest niet bij meerdere facturen met hetzelfde bedrag (tenzij naam onderscheidt)", () => {
    const ambiguous = [
      { id: "x", total_inc_vat: 300, client_name: "Klant A" },
      { id: "y", total_inc_vat: 300, client_name: "Klant B" },
    ];
    expect(matchPayment({ amount: 300 }, ambiguous)).toBeNull();
    const m = matchPayment({ amount: 300, counterpartName: "Klant B" }, ambiguous);
    expect(m?.invoiceId).toBe("y");
  });

  it("geeft null bij geen match of niet-positief bedrag", () => {
    expect(matchPayment({ amount: 777 }, invoices)).toBeNull();
    expect(matchPayment({ amount: -1210 }, invoices)).toBeNull();
  });
});

describe("decidePaymentMatch", () => {
  it("exact bedrag → autonoom koppelen (Tier 1, execute)", () => {
    const d = decidePaymentMatch({ amount: 1210 }, invoices, ok);
    expect(d?.action.tier).toBe(1);
    expect(d?.decision.decision).toBe("execute");
    expect(d?.match.invoiceId).toBe("a");
  });

  it("gebroken invariant → block; noodstop → voorleggen", () => {
    expect(decidePaymentMatch({ amount: 1210 }, invoices, { autonomyEnabled: true, invariantsOk: false })?.decision.decision).toBe("block");
    expect(decidePaymentMatch({ amount: 1210 }, invoices, { autonomyEnabled: false, invariantsOk: true })?.decision.decision).toBe("propose");
  });

  it("geen verantwoorde match → null", () => {
    expect(decidePaymentMatch({ amount: 777 }, invoices, ok)).toBeNull();
  });
});
