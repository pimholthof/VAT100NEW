import { describe, it, expect } from "vitest";
import {
  getKorStatus,
  KOR_THRESHOLD_EUR,
  KOR_WARN_AT_EUR,
} from "./kor-threshold";

type Row = { subtotal_ex_vat: number };

function mockSupabase(rows: Row[]) {
  return {
    from() {
      const builder = {
        select() {
          return builder;
        },
        eq() {
          return builder;
        },
        is() {
          return builder;
        },
        in() {
          return builder;
        },
        gte() {
          return builder;
        },
        lt() {
          return Promise.resolve({ data: rows, error: null });
        },
      };
      return builder;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const NOW = new Date("2026-04-16T10:00:00Z");

describe("getKorStatus", () => {
  it("returns ok when well below threshold", async () => {
    const result = await getKorStatus(
      mockSupabase([{ subtotal_ex_vat: 5_000 }]),
      "u1",
      { now: NOW }
    );
    expect(result.status).toBe("ok");
    expect(result.message).toBeNull();
    expect(result.ytdRevenueExVat).toBe(5_000);
    expect(result.remaining).toBe(15_000);
  });

  it("flags approaching at 80% (€16k)", async () => {
    const result = await getKorStatus(
      mockSupabase([{ subtotal_ex_vat: KOR_WARN_AT_EUR }]),
      "u1",
      { now: NOW }
    );
    expect(result.status).toBe("approaching");
    expect(result.message).toContain("nadert");
  });

  it("flags exceeded at or above €20k", async () => {
    const result = await getKorStatus(
      mockSupabase([{ subtotal_ex_vat: KOR_THRESHOLD_EUR + 50 }]),
      "u1",
      { now: NOW }
    );
    expect(result.status).toBe("exceeded");
    expect(result.remaining).toBe(0);
    expect(result.message).toContain("overschreden");
  });

  it("aggregates multiple invoices", async () => {
    const result = await getKorStatus(
      mockSupabase([
        { subtotal_ex_vat: 7_500 },
        { subtotal_ex_vat: 9_000 },
      ]),
      "u1",
      { now: NOW }
    );
    expect(result.ytdRevenueExVat).toBe(16_500);
    expect(result.status).toBe("approaching");
  });

  it("returns 0 revenue when no invoices", async () => {
    const result = await getKorStatus(mockSupabase([]), "u1", { now: NOW });
    expect(result.ytdRevenueExVat).toBe(0);
    expect(result.status).toBe("ok");
  });

  it("respects korEnabled option", async () => {
    const result = await getKorStatus(mockSupabase([]), "u1", {
      now: NOW,
      korEnabled: false,
    });
    expect(result.enabled).toBe(false);
  });
});
