import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock createServiceClient
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("vies-lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parsed BTW-nummer correct: landcode + nummer", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        valid: true,
        name: "Test BV",
        address: "Keizersgracht 1, Amsterdam",
      }),
    });

    const { lookupVIES } = await import("@/lib/services/vies-lookup");
    const result = await lookupVIES("NL123456789B01");

    expect(result.countryCode).toBe("NL");
    expect(result.vatNumber).toBe("123456789B01");
    expect(result.valid).toBe(true);
    expect(result.name).toBe("Test BV");
    expect(result.address).toBe("Keizersgracht 1, Amsterdam");
  });

  it("retourneert fout bij te kort BTW-nummer", async () => {
    const { lookupVIES } = await import("@/lib/services/vies-lookup");
    const result = await lookupVIES("NL");

    expect(result.valid).toBeNull();
    expect(result.error).toBe("Ongeldig BTW-nummer formaat");
  });

  it("handelt VIES onbereikbaarheid correct af", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    const { lookupVIES } = await import("@/lib/services/vies-lookup");
    const result = await lookupVIES("DE123456789");

    expect(result.valid).toBeNull();
    expect(result.error).toBe("VIES service niet beschikbaar");
    expect(result.countryCode).toBe("DE");
    expect(result.vatNumber).toBe("123456789");
  });

  it("handelt netwerk timeout correct af", async () => {
    mockFetch.mockRejectedValueOnce(new Error("AbortError"));

    const { lookupVIES } = await import("@/lib/services/vies-lookup");
    const result = await lookupVIES("BE0123456789");

    expect(result.valid).toBeNull();
    expect(result.error).toBe("VIES service niet beschikbaar");
  });

  it("verwijdert spaties en normaliseert naar hoofdletters", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        valid: false,
        name: null,
        address: null,
      }),
    });

    const { lookupVIES } = await import("@/lib/services/vies-lookup");
    const result = await lookupVIES(" nl 123 456 789 B01 ");

    expect(result.countryCode).toBe("NL");
    expect(result.vatNumber).toBe("123456789B01");
    expect(result.valid).toBe(false);
  });

  it("stuurt POST request naar VIES API met correcte body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true, name: null, address: null }),
    });

    const { lookupVIES } = await import("@/lib/services/vies-lookup");
    await lookupVIES("FR12345678901");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode: "FR", vatNumber: "12345678901" }),
      })
    );
  });
});
