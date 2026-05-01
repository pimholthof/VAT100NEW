import { describe, it, expect } from "vitest";
import { checkKor, KOR_OMZET_THRESHOLD } from "./kor";

describe("checkKor", () => {
  it("returns within and no warning when user does not use KOR", () => {
    const r = checkKor(50_000, false);
    expect(r.status).toBe("within");
    expect(r.warning).toBeNull();
    expect(r.usesKor).toBe(false);
  });

  it("returns within when KOR user is well under the threshold", () => {
    const r = checkKor(5_000, true);
    expect(r.status).toBe("within");
    expect(r.warning).toBeNull();
    expect(r.remainingHeadroom).toBe(15_000);
  });

  it("returns approaching at exactly 90% of the threshold (€18.000)", () => {
    const r = checkKor(18_000, true);
    expect(r.status).toBe("approaching");
    expect(r.warning).toMatch(/nadert de KOR-drempel/);
    expect(r.remainingHeadroom).toBe(2_000);
  });

  it("returns approaching at €19.999 (just under threshold)", () => {
    const r = checkKor(19_999, true);
    expect(r.status).toBe("approaching");
    expect(r.remainingHeadroom).toBe(1);
  });

  it("returns exceeded at exactly the €20.000 threshold", () => {
    const r = checkKor(KOR_OMZET_THRESHOLD, true);
    expect(r.status).toBe("exceeded");
    expect(r.warning).toMatch(/overschreden/);
    expect(r.remainingHeadroom).toBe(0);
  });

  it("returns exceeded above the threshold", () => {
    const r = checkKor(25_000, true);
    expect(r.status).toBe("exceeded");
    expect(r.remainingHeadroom).toBe(0);
  });

  it("treats negative revenue as zero (defensive)", () => {
    const r = checkKor(-100, true);
    expect(r.status).toBe("within");
    expect(r.yearRevenue).toBe(0);
  });

  it("treats NaN revenue as zero (defensive)", () => {
    const r = checkKor(Number.NaN, true);
    expect(r.status).toBe("within");
    expect(r.yearRevenue).toBe(0);
  });

  it("does not warn non-KOR users approaching €20.000", () => {
    const r = checkKor(19_500, false);
    expect(r.status).toBe("within");
    expect(r.warning).toBeNull();
  });

  it("does not warn non-KOR users exceeding €20.000", () => {
    const r = checkKor(50_000, false);
    expect(r.status).toBe("within");
    expect(r.warning).toBeNull();
  });
});
