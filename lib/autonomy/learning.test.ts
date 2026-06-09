import { describe, it, expect } from "vitest";
import {
  normalizePattern,
  matchLearnedRule,
  decideLearnedRuleApplication,
  consolidateCorrections,
  EXACT_MATCH_CONFIDENCE,
  CONTAINS_MATCH_CONFIDENCE,
} from "./learning";
import type { DispatchContext } from "./dispatcher";

const ok: DispatchContext = { autonomyEnabled: true, invariantsOk: true };

const rules = [
  { pattern: "Coolblue", value: "Computer & software", isIncome: false },
  { pattern: "NS", value: "Vervoerskosten", isIncome: false },
];

describe("normalizePattern", () => {
  it("lowercased en getrimd", () => {
    expect(normalizePattern("  CoolBlue ")).toBe("coolblue");
  });
});

describe("matchLearnedRule", () => {
  it("matcht exact (case-insensitief) met hoge confidence", () => {
    const m = matchLearnedRule(rules, "coolblue");
    expect(m?.rule.value).toBe("Computer & software");
    expect(m?.matchType).toBe("exact");
    expect(m?.confidence).toBe(EXACT_MATCH_CONFIDENCE);
  });

  it("doet standaard géén bevat-match", () => {
    expect(matchLearnedRule(rules, "coolblue amsterdam")).toBeNull();
  });

  it("doet bevat-match alleen met allowContains, langste patroon wint", () => {
    const withShort = [{ pattern: "shell", value: "Vervoer" }, { pattern: "shell rotterdam", value: "Specifiek" }];
    const m = matchLearnedRule(withShort, "betaling shell rotterdam centrum", { allowContains: true });
    expect(m?.rule.value).toBe("Specifiek");
    expect(m?.matchType).toBe("contains");
    expect(m?.confidence).toBe(CONTAINS_MATCH_CONFIDENCE);
  });

  it("geeft null bij lege sleutel of geen match", () => {
    expect(matchLearnedRule(rules, "   ")).toBeNull();
    expect(matchLearnedRule(rules, "onbekend")).toBeNull();
  });
});

describe("decideLearnedRuleApplication", () => {
  it("exacte match → execute via Tier 1", () => {
    const d = decideLearnedRuleApplication(rules, "coolblue", ok);
    expect(d?.action.tier).toBe(1);
    expect(d?.decision.decision).toBe("execute");
    expect(d?.match.rule.value).toBe("Computer & software");
  });

  it("geen match → null", () => {
    expect(decideLearnedRuleApplication(rules, "onbekend", ok)).toBeNull();
  });

  it("gebroken invariant → block (niet toepassen)", () => {
    const d = decideLearnedRuleApplication(rules, "coolblue", { autonomyEnabled: true, invariantsOk: false });
    expect(d?.decision.decision).toBe("block");
  });

  it("noodstop → voorleggen i.p.v. zelf toepassen", () => {
    const d = decideLearnedRuleApplication(rules, "coolblue", { autonomyEnabled: false, invariantsOk: true });
    expect(d?.decision.decision).toBe("propose");
  });
});

describe("consolidateCorrections", () => {
  it("kiest de dominante waarde en telt de kracht", () => {
    const consolidated = consolidateCorrections([
      { pattern: "Coolblue", value: "Computer & software" },
      { pattern: "coolblue", value: "Computer & software" },
      { pattern: "CoolBlue", value: "Kantoorkosten" },
    ]);
    expect(consolidated).toHaveLength(1);
    expect(consolidated[0].pattern).toBe("coolblue");
    expect(consolidated[0].value).toBe("Computer & software");
    expect(consolidated[0].strength).toBe(2);
    expect(consolidated[0].total).toBe(3);
    expect(consolidated[0].conflicted).toBe(true);
  });

  it("markeert een eensluidend patroon als niet-conflicterend en sorteert op kracht", () => {
    const consolidated = consolidateCorrections([
      { pattern: "A", value: "x" },
      { pattern: "B", value: "y" },
      { pattern: "B", value: "y" },
    ]);
    expect(consolidated[0].pattern).toBe("b");
    expect(consolidated[0].conflicted).toBe(false);
    expect(consolidated[0].strength).toBe(2);
  });
});
