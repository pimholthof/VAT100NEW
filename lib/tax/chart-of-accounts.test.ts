import { describe, it, expect } from "vitest";
import {
  ALL_ACCOUNTS,
  BALANCE_ACCOUNTS,
  REVENUE_ACCOUNTS,
  EXPENSE_ACCOUNTS,
  getAccount,
  getAccountName,
  isRepresentatie,
  REPRESENTATIE_CODES,
  HORECA_CODES,
  getRevenueAccountCode,
} from "./chart-of-accounts";

describe("chart-of-accounts — structural integrity", () => {
  it("ALL_ACCOUNTS contains every static account list", () => {
    expect(ALL_ACCOUNTS.length).toBe(
      BALANCE_ACCOUNTS.length + REVENUE_ACCOUNTS.length + EXPENSE_ACCOUNTS.length
    );
  });

  it("has no duplicate account codes — accounting requires unique numbers", () => {
    const codes = ALL_ACCOUNTS.map((a) => a.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("balance accounts use the 1xxx-2xxx range", () => {
    for (const a of BALANCE_ACCOUNTS) {
      expect(a.code).toBeGreaterThanOrEqual(1000);
      expect(a.code).toBeLessThan(3000);
    }
  });

  it("revenue accounts use the 8xxx range", () => {
    for (const a of REVENUE_ACCOUNTS) {
      expect(a.code).toBeGreaterThanOrEqual(8000);
      expect(a.code).toBeLessThan(9000);
      expect(a.type).toBe("revenue");
    }
  });

  it("expense accounts use the 4xxx range and have type=expense", () => {
    for (const a of EXPENSE_ACCOUNTS) {
      expect(a.code).toBeGreaterThanOrEqual(4000);
      expect(a.code).toBeLessThan(5000);
      expect(a.type).toBe("expense");
    }
  });
});

describe("getAccount / getAccountName", () => {
  it("looks up an existing account by code", () => {
    const bank = getAccount(1000);
    expect(bank?.name).toBe("Bank");
    expect(bank?.type).toBe("asset");
  });

  it("returns undefined for an unknown code", () => {
    expect(getAccount(9999)).toBeUndefined();
  });

  it("getAccountName returns the name for a known code", () => {
    expect(getAccountName(1000)).toBe("Bank");
  });

  it("getAccountName returns a stable fallback for unknown codes", () => {
    expect(getAccountName(9999)).toBe("Onbekend (9999)");
  });
});

describe("isRepresentatie", () => {
  it("returns true for the documented representatie codes", () => {
    for (const code of REPRESENTATIE_CODES) {
      expect(isRepresentatie(code)).toBe(true);
    }
  });

  it("returns false for ordinary expense codes", () => {
    expect(isRepresentatie(4100)).toBe(false); // Huur
    expect(isRepresentatie(4500)).toBe(false); // Vervoer
  });

  it("returns false for null (uncategorised receipt)", () => {
    expect(isRepresentatie(null)).toBe(false);
  });

  it("HORECA_CODES is a subset of REPRESENTATIE_CODES (4900 covers both)", () => {
    for (const code of HORECA_CODES) {
      expect(REPRESENTATIE_CODES.has(code)).toBe(true);
    }
  });
});

describe("getRevenueAccountCode", () => {
  it("standard scheme → 8000 (omzet diensten)", () => {
    expect(getRevenueAccountCode("standard")).toBe(8000);
  });

  it("EU reverse charge → 8200 (ICP)", () => {
    expect(getRevenueAccountCode("eu_reverse_charge")).toBe(8200);
  });

  it("export outside EU → 8300", () => {
    expect(getRevenueAccountCode("export_outside_eu")).toBe(8300);
  });

  it("every returned code exists in REVENUE_ACCOUNTS", () => {
    const codes = REVENUE_ACCOUNTS.map((a) => a.code);
    for (const scheme of ["standard", "eu_reverse_charge", "export_outside_eu"] as const) {
      expect(codes).toContain(getRevenueAccountCode(scheme));
    }
  });
});
