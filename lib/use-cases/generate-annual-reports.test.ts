import { describe, it, expect } from "vitest";
import { isAnnualReportDay } from "./generate-annual-reports";

describe("isAnnualReportDay", () => {
  it("should return true for January 2", () => {
    expect(isAnnualReportDay(new Date(2026, 0, 2))).toBe(true);
  });

  it("should return false for January 1", () => {
    expect(isAnnualReportDay(new Date(2026, 0, 1))).toBe(false);
  });

  it("should return false for January 3", () => {
    expect(isAnnualReportDay(new Date(2026, 0, 3))).toBe(false);
  });

  it("should return false for February 2", () => {
    expect(isAnnualReportDay(new Date(2026, 1, 2))).toBe(false);
  });
});
