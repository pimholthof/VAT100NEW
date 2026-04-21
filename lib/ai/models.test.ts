import { describe, it, expect } from "vitest";
import { modelFor, estimateCostCents, AI_MODELS } from "./models";

describe("modelFor", () => {
  it("routes classification to Haiku", () => {
    expect(modelFor("CLASSIFIER")).toBe(AI_MODELS.CLASSIFIER);
    expect(modelFor("CLASSIFIER")).toContain("haiku");
  });

  it("routes OCR to Sonnet", () => {
    expect(modelFor("OCR")).toContain("sonnet");
  });

  it("routes chat to Opus", () => {
    expect(modelFor("CHAT")).toContain("opus");
  });
});

describe("estimateCostCents", () => {
  it("returns zero for no tokens", () => {
    expect(estimateCostCents("OCR", 0, 0)).toBe(0);
  });

  it("charges output tokens at higher rate than input", () => {
    const inputOnly = estimateCostCents("CHAT", 1_000_000, 0);
    const outputOnly = estimateCostCents("CHAT", 0, 1_000_000);
    expect(outputOnly).toBeGreaterThan(inputOnly);
  });

  it("haiku is cheaper than opus for identical token volume", () => {
    const haikuCost = estimateCostCents("CLASSIFIER", 100_000, 10_000);
    const opusCost = estimateCostCents("CHAT", 100_000, 10_000);
    // Haiku input $1/M vs Opus $15/M → at least 10x goedkoper
    expect(opusCost).toBeGreaterThan(haikuCost * 10);
  });

  it("1M input + 0 output on OCR costs approximately $3 = 300 cents", () => {
    // Sonnet: $3/M input. 1M tokens = $3.00 = 300 cents
    const cost = estimateCostCents("OCR", 1_000_000, 0);
    expect(cost).toBe(300);
  });

  it("rounds up fractional cents", () => {
    // 1000 input tokens on OCR: 1000 * 3 / 1_000_000 = 0.003 USD = 0.3 cents → 1 cent (ceil)
    const cost = estimateCostCents("OCR", 1000, 0);
    expect(cost).toBe(1);
  });
});
