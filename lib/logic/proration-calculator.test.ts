import { describe, it, expect } from "vitest";
import { calculateProration } from "./proration-calculator";

describe("calculateProration", () => {
  it("should calculate upgrade proration correctly", () => {
    const result = calculateProration(
      2900, // basis: €29
      5900, // compleet: €59
      "2026-04-01",
      "2026-05-01",
      "2026-04-16" // halverwege de maand
    );

    expect(result.isUpgrade).toBe(true);
    expect(result.remainingDays).toBe(15);
    expect(result.totalDaysInPeriod).toBe(30);
    expect(result.prorationAmount).toBeGreaterThan(0);
    // Credit: 2900/30 * 15 = 1450
    // Charge: 5900/30 * 15 = 2950
    // Net: 2950 - 1450 = 1500
    expect(result.prorationAmount).toBe(1500);
  });

  it("should calculate downgrade proration correctly", () => {
    const result = calculateProration(
      5900, // compleet: €59
      2900, // basis: €29
      "2026-04-01",
      "2026-05-01",
      "2026-04-16"
    );

    expect(result.isUpgrade).toBe(false);
    expect(result.prorationAmount).toBeLessThan(0);
    // Credit: 5900/30 * 15 = 2950
    // Charge: 2900/30 * 15 = 1450
    // Net: 1450 - 2950 = -1500
    expect(result.prorationAmount).toBe(-1500);
  });

  it("should return 0 proration at end of period", () => {
    const result = calculateProration(
      2900,
      5900,
      "2026-04-01",
      "2026-05-01",
      "2026-05-01" // op de laatste dag
    );

    expect(result.remainingDays).toBe(0);
    expect(result.prorationAmount).toBe(0);
  });

  it("should handle same plan (no change)", () => {
    const result = calculateProration(
      2900,
      2900,
      "2026-04-01",
      "2026-05-01",
      "2026-04-15"
    );

    expect(result.prorationAmount).toBe(0);
    expect(result.isUpgrade).toBe(false);
  });
});
