import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockRpc = vi.fn();
const mockSelect = vi.fn();

// Mock createServiceClient
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    rpc: mockRpc,
    from: vi.fn((table: string) => {
      if (table === "reserve_snapshots") {
        return { insert: mockInsert };
      }
      // receipts table queries
      return {
        select: mockSelect.mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                or: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                not: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
            not: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      };
    }),
  })),
}));

// Mock tax calculation
vi.mock("@/lib/tax/dutch-tax-2026", () => ({
  calculateZZPTaxProjection: vi.fn(({ jaarOmzetExBtw }) => ({
    nettoIB: jaarOmzetExBtw > 0 ? jaarOmzetExBtw * 0.2 : 0, // Simplified: 20% IB
    brutoOmzet: jaarOmzetExBtw,
    kosten: 0,
    afschrijvingen: 0,
    brutoWinst: jaarOmzetExBtw,
    zelfstandigenaftrek: 1200,
    mkbVrijstelling: 0,
    kia: 0,
    totalInvestments: 0,
    belastbaarInkomen: jaarOmzetExBtw,
    inkomstenbelasting: jaarOmzetExBtw * 0.3,
    algemeneHeffingskorting: 3115,
    arbeidskorting: 5000,
    effectiefTarief: 0.2,
    prognoseJaarOmzet: jaarOmzetExBtw,
    prognoseJaarKosten: 0,
    prognoseJaarIB: jaarOmzetExBtw * 0.2,
    afschrijvingDetails: [],
    bespaartips: [],
  })),
}));

describe("reserve-recalculator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("berekent reserves en schrijft snapshot", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        bankBalance: 10000,
        outputVat: 2100,
        inputVat: 500,
        yearRevenueRecords: [
          { total_inc_vat: 12100, vat_amount: 2100 },
        ],
      },
      error: null,
    });

    const { recalculateReserves } = await import(
      "@/lib/services/reserve-recalculator"
    );
    await recalculateReserves("user-123", "classification", "tx-456");

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const inserted = mockInsert.mock.calls[0][0];

    expect(inserted.user_id).toBe("user-123");
    expect(inserted.trigger_type).toBe("classification");
    expect(inserted.trigger_transaction_id).toBe("tx-456");
    expect(inserted.bank_balance).toBe(10000);
    expect(inserted.estimated_vat).toBe(1600); // 2100 - 500
    // estimated_income_tax: 10000 (revenue ex vat) * 0.2 = 2000
    expect(inserted.estimated_income_tax).toBe(2000);
    expect(inserted.reserved_total).toBe(3600); // 1600 + 2000
    expect(inserted.safe_to_spend).toBe(6400); // 10000 - 3600
  });

  it("slikt fouten zonder te gooien", async () => {
    mockRpc.mockRejectedValueOnce(new Error("Database down"));

    const { recalculateReserves } = await import(
      "@/lib/services/reserve-recalculator"
    );

    // Moet geen exception gooien
    await expect(
      recalculateReserves("user-123", "sync")
    ).resolves.toBeUndefined();
  });

  it("zet trigger_transaction_id op null als niet meegegeven", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        bankBalance: 5000,
        outputVat: 1000,
        inputVat: 200,
        yearRevenueRecords: [],
      },
      error: null,
    });

    const { recalculateReserves } = await import(
      "@/lib/services/reserve-recalculator"
    );
    await recalculateReserves("user-789", "manual");

    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.trigger_transaction_id).toBeNull();
    expect(inserted.trigger_type).toBe("manual");
  });

  it("berekent BTW-reservering als 0 wanneer inputVat > outputVat", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        bankBalance: 8000,
        outputVat: 200,
        inputVat: 500,
        yearRevenueRecords: [],
      },
      error: null,
    });

    const { recalculateReserves } = await import(
      "@/lib/services/reserve-recalculator"
    );
    await recalculateReserves("user-abc", "classification");

    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.estimated_vat).toBe(0); // max(0, 200-500) = 0
  });
});
