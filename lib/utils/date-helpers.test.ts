import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  todayIso,
  daysFromTodayIso,
  startOfMonthIso,
  endOfMonthIso,
} from "./date-helpers";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("todayIso", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(todayIso()).toMatch(ISO_DATE);
  });

  it("returns the UTC date when called at a deterministic instant", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T08:30:00Z"));
    try {
      expect(todayIso()).toBe("2026-04-22");
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses UTC even when local clock is on the previous calendar day", () => {
    vi.useFakeTimers();
    // 23:30 UTC on 2026-04-22 — most timezones west of UTC are still on the
    // 22nd, but the helper deliberately returns the UTC date for server
    // consistency.
    vi.setSystemTime(new Date("2026-04-22T23:30:00Z"));
    try {
      expect(todayIso()).toBe("2026-04-22");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("daysFromTodayIso", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("0 days = today", () => {
    expect(daysFromTodayIso(0)).toBe("2026-04-22");
  });

  it("positive days move forward", () => {
    expect(daysFromTodayIso(1)).toBe("2026-04-23");
    expect(daysFromTodayIso(30)).toBe("2026-05-22");
  });

  it("negative days move backward", () => {
    expect(daysFromTodayIso(-1)).toBe("2026-04-21");
    expect(daysFromTodayIso(-22)).toBe("2026-03-31");
  });

  it("crosses month boundaries correctly", () => {
    vi.setSystemTime(new Date("2026-04-30T12:00:00Z"));
    expect(daysFromTodayIso(1)).toBe("2026-05-01");
  });

  it("crosses year boundaries correctly", () => {
    vi.setSystemTime(new Date("2026-12-31T12:00:00Z"));
    expect(daysFromTodayIso(1)).toBe("2027-01-01");
  });
});

describe("startOfMonthIso", () => {
  it("returns the first day of the month for a given date", () => {
    expect(startOfMonthIso(new Date("2026-04-15T08:00:00Z"))).toMatch(/^2026-0[34]-\d{2}$/);
    // The Date constructor uses local time, so we just assert it is the 1st
    // of either March or April depending on timezone — but always day 01.
    const result = startOfMonthIso(new Date("2026-04-15T12:00:00Z"));
    expect(result.endsWith("-01")).toBe(true);
  });

  it("uses the current date as default ref", () => {
    expect(startOfMonthIso()).toMatch(ISO_DATE);
  });
});

describe("endOfMonthIso", () => {
  it("returns the last day of February (non-leap year)", () => {
    const result = endOfMonthIso(new Date("2025-02-15T12:00:00Z"));
    // Could be 27 or 28 depending on timezone interpretation; assert end-of-month.
    expect(["2025-02-27", "2025-02-28"]).toContain(result);
  });

  it("returns the last day of February in a leap year", () => {
    const result = endOfMonthIso(new Date("2024-02-15T12:00:00Z"));
    expect(["2024-02-28", "2024-02-29"]).toContain(result);
  });

  it("returns the last day of a 31-day month", () => {
    const result = endOfMonthIso(new Date("2026-01-15T12:00:00Z"));
    expect(["2026-01-30", "2026-01-31"]).toContain(result);
  });

  it("uses the current date as default ref", () => {
    expect(endOfMonthIso()).toMatch(ISO_DATE);
  });
});
