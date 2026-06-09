import { describe, it, expect } from "vitest";
import {
  decideAction,
  defineAction,
  tierFor,
  ACTION_TIERS,
  TIER1_MIN_CONFIDENCE,
  TIER2_MIN_CONFIDENCE,
  type AgentAction,
  type DispatchContext,
} from "./dispatcher";

const ok: DispatchContext = { autonomyEnabled: true, invariantsOk: true };

function action(tier: 0 | 1 | 2 | 3, confidence: number): AgentAction {
  return { kind: `t${tier}`, tier, confidence, evidence: [], summary: "test" };
}

describe("tierFor / defineAction", () => {
  it("onbekende soort valt terug op de veiligste tier (3)", () => {
    expect(tierFor("iets_onbekends")).toBe(3);
  });

  it("kent bekende soorten de juiste tier toe", () => {
    expect(tierFor("recompute_reserve")).toBe(0);
    expect(tierFor("mark_invoice_overdue")).toBe(1);
    expect(tierFor("send_payment_reminder")).toBe(2);
    expect(tierFor("submit_vat_return")).toBe(3);
  });

  it("defineAction haalt de tier uit het beleid en clampt confidence", () => {
    const a = defineAction("match_payment_to_invoice", { confidence: 1.5, evidence: ["bedrag = €1.210"], summary: "Match" });
    expect(a.tier).toBe(ACTION_TIERS.match_payment_to_invoice);
    expect(a.confidence).toBe(1);
  });
});

describe("decideAction — tiers", () => {
  it("Tier 0 voert altijd uit (ook bij noodstop)", () => {
    expect(decideAction(action(0, 0), { autonomyEnabled: false, invariantsOk: true }).decision).toBe("execute");
  });

  it("Tier 3 wordt nooit autonoom, ook bij volle zekerheid", () => {
    expect(decideAction(action(3, 1), ok).decision).toBe("propose");
  });

  it("Tier 1 voert uit bij voldoende zekerheid, anders voorstel", () => {
    expect(decideAction(action(1, TIER1_MIN_CONFIDENCE), ok).decision).toBe("execute");
    expect(decideAction(action(1, TIER1_MIN_CONFIDENCE - 0.01), ok).decision).toBe("propose");
  });

  it("Tier 2 vereist een hogere drempel dan Tier 1", () => {
    expect(decideAction(action(2, TIER1_MIN_CONFIDENCE), ok).decision).toBe("propose");
    expect(decideAction(action(2, TIER2_MIN_CONFIDENCE), ok).decision).toBe("execute");
  });
});

describe("decideAction — vangrails", () => {
  it("blokkeert muterende acties als een invariant zou breken", () => {
    const r = decideAction(action(1, 1), { autonomyEnabled: true, invariantsOk: false });
    expect(r.decision).toBe("block");
  });

  it("maar Tier 0 (lezen) wordt niet geblokkeerd door invarianten", () => {
    expect(decideAction(action(0, 1), { autonomyEnabled: true, invariantsOk: false }).decision).toBe("execute");
  });

  it("noodstop degradeert muterende acties naar voorstel", () => {
    expect(decideAction(action(1, 1), { autonomyEnabled: false, invariantsOk: true }).decision).toBe("propose");
  });

  it("schaduwmodus voert niets uit, maar legt vast wat het zou doen", () => {
    const r = decideAction(action(1, 1), { autonomyEnabled: true, invariantsOk: true, shadowMode: true });
    expect(r.decision).toBe("propose");
    expect(r.reason).toMatch(/schaduw/i);
  });

  it("invariant-blokkade gaat vóór de Tier 3-poort", () => {
    const r = decideAction(action(3, 1), { autonomyEnabled: true, invariantsOk: false });
    expect(r.decision).toBe("block");
  });
});
