import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/auth/verify-cron-secret", () => ({
  verifyCronSecret: vi.fn(),
}));

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

vi.mock("@/lib/banking/tink", () => ({
  bankingClient: {
    getTransactions: vi.fn(),
  },
}));

vi.mock("@/features/banking/actions", () => ({
  autoCategorizeTransactionsInternal: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/services/reserve-recalculator", () => ({
  recalculateReserves: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/payment-reconciliation", () => ({
  autoReconcilePayments: vi.fn().mockResolvedValue({ matched: 0, matches: [] }),
}));

vi.mock("@/lib/services/receipt-matcher", () => ({
  autoMatchReceipts: vi.fn().mockResolvedValue({ matched: 0, suggestions: [] }),
}));

vi.mock("@/lib/monitoring/cron-alerts", () => ({
  alertCronFailure: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/cron/lock", () => ({
  withCronLock: vi.fn((_name: string, handler: () => Promise<unknown>) => handler()),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

describe("cron/sync-bank", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourneert 401 zonder geldig cron secret", async () => {
    const { verifyCronSecret } = await import("@/lib/auth/verify-cron-secret");
    vi.mocked(verifyCronSecret).mockReturnValue(false);

    const { GET } = await import("@/app/api/cron/sync-bank/route");
    const request = new Request("http://localhost/api/cron/sync-bank");
    const response = await GET(request as unknown as import("next/server").NextRequest);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("retourneert leeg resultaat als er geen actieve connecties zijn", async () => {
    const { verifyCronSecret } = await import("@/lib/auth/verify-cron-secret");
    vi.mocked(verifyCronSecret).mockReturnValue(true);

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          not: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    const { GET } = await import("@/app/api/cron/sync-bank/route");
    const request = new Request("http://localhost/api/cron/sync-bank");
    const response = await GET(request as unknown as import("next/server").NextRequest);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.synced).toBe(0);
  });

  it("gaat door met volgende connectie als één faalt", async () => {
    const { verifyCronSecret } = await import("@/lib/auth/verify-cron-secret");
    vi.mocked(verifyCronSecret).mockReturnValue(true);

    const { bankingClient } = await import("@/lib/banking/tink");

    // Eerste call gooit error, tweede succeeds
    vi.mocked(bankingClient.getTransactions)
      .mockRejectedValueOnce(new Error("Tink timeout"))
      .mockResolvedValueOnce({ transactions: { booked: [] } });

    const connections = [
      { id: "conn-1", user_id: "user-1", account_id: "ref1::acc1", last_synced_at: null },
      { id: "conn-2", user_id: "user-2", account_id: "ref2::acc2", last_synced_at: null },
    ];

    // Mock chain for initial connections query
    mockFrom.mockImplementation((table: string) => {
      if (table === "bank_connections") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue({ data: connections, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "system_events") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      };
    });

    const { GET } = await import("@/app/api/cron/sync-bank/route");
    const request = new Request("http://localhost/api/cron/sync-bank");
    const response = await GET(request as unknown as import("next/server").NextRequest);

    const body = await response.json();
    expect(response.status).toBe(200);
    // Eerste connectie faalde, maar response moet toch 200 zijn
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].connectionId).toBe("conn-1");

    // Sentry moet aangeroepen zijn
    const Sentry = await import("@sentry/nextjs");
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });
});
