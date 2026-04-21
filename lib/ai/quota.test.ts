import { describe, it, expect } from "vitest";

/**
 * Pure-logica tests voor quota-drempels en waarschuwingsniveaus.
 *
 * De daadwerkelijke RPC `consume_ai_quota` is een PL/pgSQL functie en wordt
 * via Supabase aangeroepen — die dekken we met integration-tests in CI
 * (buiten scope voor deze unit-test-suite). Hier testen we de pure
 * beslissings-logica die bepaalt of de banner verschijnt.
 */

type QuotaStatus = {
  ocrUsed: number;
  ocrLimit: number | null;
  chatUsed: number;
  chatLimit: number | null;
};

function isOverThreshold(
  used: number,
  limit: number | null,
  threshold = 0.8,
): boolean {
  if (limit === null) return false; // onbeperkt (Plus)
  if (limit === 0) return false;
  return used / limit >= threshold;
}

function isAtOrOverLimit(used: number, limit: number | null): boolean {
  if (limit === null) return false;
  if (limit === 0) return false;
  return used >= limit;
}

function shouldShowBanner(s: QuotaStatus): boolean {
  return (
    isOverThreshold(s.ocrUsed, s.ocrLimit) ||
    isOverThreshold(s.chatUsed, s.chatLimit)
  );
}

describe("quota threshold logic", () => {
  it("Plus tier (onbeperkt) triggert nooit de banner", () => {
    expect(
      shouldShowBanner({
        ocrUsed: 999,
        ocrLimit: null,
        chatUsed: 999,
        chatLimit: null,
      }),
    ).toBe(false);
  });

  it("Start tier (0 OCR quota) triggert geen banner bij 0 gebruik", () => {
    expect(
      shouldShowBanner({
        ocrUsed: 0,
        ocrLimit: 0,
        chatUsed: 0,
        chatLimit: 0,
      }),
    ).toBe(false);
  });

  it("Studio: 40/50 OCR (80%) triggert de banner", () => {
    expect(
      shouldShowBanner({
        ocrUsed: 40,
        ocrLimit: 50,
        chatUsed: 0,
        chatLimit: 0,
      }),
    ).toBe(true);
  });

  it("Studio: 39/50 OCR (78%) triggert de banner NIET", () => {
    expect(
      shouldShowBanner({
        ocrUsed: 39,
        ocrLimit: 50,
        chatUsed: 0,
        chatLimit: 0,
      }),
    ).toBe(false);
  });

  it("Complete: 161/200 chat (80.5%) triggert de banner", () => {
    expect(
      shouldShowBanner({
        ocrUsed: 0,
        ocrLimit: 300,
        chatUsed: 161,
        chatLimit: 200,
      }),
    ).toBe(true);
  });

  it("Over-limiet (OCR) wordt gedetecteerd", () => {
    expect(isAtOrOverLimit(50, 50)).toBe(true);
    expect(isAtOrOverLimit(51, 50)).toBe(true);
    expect(isAtOrOverLimit(49, 50)).toBe(false);
  });

  it("Over-limiet bij Plus (null) is altijd false", () => {
    expect(isAtOrOverLimit(999999, null)).toBe(false);
  });
});
