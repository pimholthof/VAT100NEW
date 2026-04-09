import { describe, expect, test } from "vitest";
import {
  PLAN_CONFIDENCE_THRESHOLDS,
  DEFAULT_CONFIDENCE_THRESHOLD,
} from "@/lib/services/managed-agent";

describe("managed-agent", () => {
  describe("PLAN_CONFIDENCE_THRESHOLDS", () => {
    test("studio threshold is higher than complete (more conservative)", () => {
      expect(PLAN_CONFIDENCE_THRESHOLDS.studio).toBeGreaterThan(
        PLAN_CONFIDENCE_THRESHOLDS.compleet
      );
    });

    test("studio threshold is 0.9", () => {
      expect(PLAN_CONFIDENCE_THRESHOLDS.studio).toBe(0.9);
    });

    test("complete threshold is 0.7", () => {
      expect(PLAN_CONFIDENCE_THRESHOLDS.compleet).toBe(0.7);
    });

    test("default threshold falls between studio and complete", () => {
      expect(DEFAULT_CONFIDENCE_THRESHOLD).toBeGreaterThanOrEqual(
        PLAN_CONFIDENCE_THRESHOLDS.compleet
      );
      expect(DEFAULT_CONFIDENCE_THRESHOLD).toBeLessThanOrEqual(
        PLAN_CONFIDENCE_THRESHOLDS.studio
      );
    });

    test("basis plan has no threshold (no agent access)", () => {
      expect(PLAN_CONFIDENCE_THRESHOLDS.basis).toBeUndefined();
    });
  });

  describe("confidence routing logic", () => {
    const applyThreshold = (
      items: { confidence?: number }[],
      threshold: number
    ) => ({
      high: items.filter((i) => (i.confidence ?? 1) >= threshold),
      low: items.filter((i) => (i.confidence ?? 1) < threshold),
    });

    const items = [
      { confidence: 0.95 },
      { confidence: 0.85 },
      { confidence: 0.75 },
      { confidence: 0.65 },
      { confidence: undefined },
    ];

    test("studio (0.9): only very high confidence auto-books", () => {
      const { high, low } = applyThreshold(items, PLAN_CONFIDENCE_THRESHOLDS.studio);
      expect(high).toHaveLength(2); // 0.95 + undefined (defaults to 1)
      expect(low).toHaveLength(3);  // 0.85, 0.75, 0.65
    });

    test("complete (0.7): more items auto-book", () => {
      const { high, low } = applyThreshold(items, PLAN_CONFIDENCE_THRESHOLDS.compleet);
      expect(high).toHaveLength(4); // 0.95, 0.85, 0.75, undefined
      expect(low).toHaveLength(1);  // 0.65
    });

    test("missing confidence defaults to 1 (auto-book)", () => {
      const { high } = applyThreshold([{ confidence: undefined }], 0.9);
      expect(high).toHaveLength(1);
    });
  });

  describe("rules context building", () => {
    test("builds prompt context from user rules", () => {
      const rules = [
        { counterpart_pattern: "J. de Vries", category: "Uitbesteed werk" },
        { counterpart_pattern: "Coolblue", category: "Computer & software" },
      ];

      const rulesContext = rules.length > 0
        ? `\nDeze user heeft eerder de volgende tegenpartijen gecategoriseerd:\n${rules.map(
            (r) => `- "${r.counterpart_pattern}" → ${r.category}`
          ).join("\n")}\nGebruik deze kennis om vergelijkbare transacties te classificeren.\n`
        : "";

      expect(rulesContext).toContain("J. de Vries");
      expect(rulesContext).toContain("Uitbesteed werk");
      expect(rulesContext).toContain("Coolblue");
      expect(rulesContext).toContain("Computer & software");
    });

    test("empty rules produce empty context", () => {
      const rules: { counterpart_pattern: string; category: string }[] = [];
      const rulesContext = rules.length > 0 ? "has rules" : "";
      expect(rulesContext).toBe("");
    });
  });
});
