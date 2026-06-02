import { describe, it, expect } from "vitest";
import { modelFor, AI_MODELS } from "./models";

describe("modelFor", () => {
  it("routes classification to Haiku", () => {
    expect(modelFor("CLASSIFIER")).toBe(AI_MODELS.CLASSIFIER);
    expect(modelFor("CLASSIFIER")).toContain("haiku");
  });

  it("routes OCR to Sonnet", () => {
    expect(modelFor("OCR")).toContain("sonnet");
  });
});
