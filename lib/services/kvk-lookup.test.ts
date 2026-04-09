import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock createServiceClient before importing the module under test
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            gt: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("kvk-lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.KVK_API_KEY;
  });

  it("retourneert lege array als KVK_API_KEY niet geconfigureerd is", async () => {
    const { lookupKvK } = await import("@/lib/services/kvk-lookup");
    const results = await lookupKvK("Test Bedrijf");
    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("retourneert lege array voor lege zoekopdracht", async () => {
    process.env.KVK_API_KEY = "test-key";
    const { lookupKvK } = await import("@/lib/services/kvk-lookup");
    const results = await lookupKvK("  ");
    expect(results).toEqual([]);
  });

  it("parsed KvK API response correct", async () => {
    process.env.KVK_API_KEY = "test-key";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        resultaten: [
          {
            kvkNummer: "12345678",
            handelsnaam: "Test BV",
            type: "BV",
            actief: "Ja",
            adres: { binnenlandsAdres: { plaats: "Amsterdam" } },
          },
          {
            kvkNummer: "87654321",
            handelsnaam: "Ander Bedrijf",
            type: "Eenmanszaak",
            actief: "Nee",
            adres: { binnenlandsAdres: { plaats: "Rotterdam" } },
          },
        ],
      }),
    });

    const { lookupKvK } = await import("@/lib/services/kvk-lookup");
    const results = await lookupKvK("Test");

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      kvkNummer: "12345678",
      handelsnaam: "Test BV",
      type: "BV",
      actief: true,
      vestigingsplaats: "Amsterdam",
    });
    expect(results[1]).toEqual({
      kvkNummer: "87654321",
      handelsnaam: "Ander Bedrijf",
      type: "Eenmanszaak",
      actief: false,
      vestigingsplaats: "Rotterdam",
    });
  });

  it("retourneert lege array bij API fout", async () => {
    process.env.KVK_API_KEY = "test-key";

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { lookupKvK } = await import("@/lib/services/kvk-lookup");
    const results = await lookupKvK("Test");
    expect(results).toEqual([]);
  });

  it("retourneert lege array bij netwerk timeout", async () => {
    process.env.KVK_API_KEY = "test-key";

    mockFetch.mockRejectedValueOnce(new Error("AbortError"));

    const { lookupKvK } = await import("@/lib/services/kvk-lookup");
    const results = await lookupKvK("Test");
    expect(results).toEqual([]);
  });

  it("stuurt correcte headers naar KvK API", async () => {
    process.env.KVK_API_KEY = "my-api-key";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ resultaten: [] }),
    });

    const { lookupKvK } = await import("@/lib/services/kvk-lookup");
    await lookupKvK("Zoekterm");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("api.kvk.nl/api/v2/zoeken"),
      expect.objectContaining({
        headers: expect.objectContaining({ apikey: "my-api-key" }),
      })
    );
  });
});
