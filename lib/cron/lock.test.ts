import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

const mockInsert = vi.fn();
const mockDeleteChain = {
  eq: vi.fn().mockReturnThis(),
  lt: vi.fn().mockResolvedValue({ error: null }),
};
const mockDelete = vi.fn().mockReturnValue(mockDeleteChain);

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: mockInsert,
      delete: mockDelete,
    })),
  })),
}));

// Mock crypto.randomUUID
vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("crypto")>();
  return {
    ...actual,
    randomUUID: vi.fn(() => "mock-lock-token-uuid"),
  };
});

// ─── Tests ───

describe("cron/lock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("acquireCronLock", () => {
    it("retourneert lockToken bij succesvolle insert", async () => {
      mockInsert.mockResolvedValue({ error: null });

      const { acquireCronLock } = await import("./lock");
      const token = await acquireCronLock("test-job");

      expect(token).toBe("mock-lock-token-uuid");
      expect(mockInsert).toHaveBeenCalledTimes(1);
      const insertedRow = mockInsert.mock.calls[0][0];
      expect(insertedRow.job_name).toBe("test-job");
      expect(insertedRow.locked_by).toBe("mock-lock-token-uuid");
      expect(insertedRow.locked_at).toBeDefined();
      expect(insertedRow.expires_at).toBeDefined();
    });

    it("berekent expires_at op basis van TTL", async () => {
      mockInsert.mockResolvedValue({ error: null });

      const { acquireCronLock } = await import("./lock");
      await acquireCronLock("test-job", 15);

      const insertedRow = mockInsert.mock.calls[0][0];
      const expiresAt = new Date(insertedRow.expires_at);
      const now = new Date("2026-04-10T12:00:00.000Z");
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / 60_000;
      expect(diffMinutes).toBe(15);
    });

    it("gebruikt default TTL van 10 minuten", async () => {
      mockInsert.mockResolvedValue({ error: null });

      const { acquireCronLock } = await import("./lock");
      await acquireCronLock("test-job");

      const insertedRow = mockInsert.mock.calls[0][0];
      const expiresAt = new Date(insertedRow.expires_at);
      const now = new Date("2026-04-10T12:00:00.000Z");
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / 60_000;
      expect(diffMinutes).toBe(10);
    });

    it("retourneert null bij unique constraint violation (lock bestaat al)", async () => {
      mockInsert.mockResolvedValue({
        error: { code: "23505", message: "duplicate key" },
      });

      const { acquireCronLock } = await import("./lock");
      const token = await acquireCronLock("running-job");

      expect(token).toBeNull();
    });

    it("retourneert lockToken bij andere fouten (fail-open)", async () => {
      mockInsert.mockResolvedValue({
        error: { code: "42P01", message: "relation does not exist" },
      });

      const { acquireCronLock } = await import("./lock");
      const token = await acquireCronLock("test-job");

      expect(token).toBe("mock-lock-token-uuid");
    });

    it("verwijdert verlopen locks voordat de nieuwe lock wordt geclaimd", async () => {
      mockInsert.mockResolvedValue({ error: null });

      const { acquireCronLock } = await import("./lock");
      await acquireCronLock("test-job");

      // delete() is called before insert()
      expect(mockDelete).toHaveBeenCalled();
      expect(mockDeleteChain.lt).toHaveBeenCalledWith(
        "expires_at",
        new Date("2026-04-10T12:00:00.000Z").toISOString()
      );
    });
  });

  describe("releaseCronLock", () => {
    it("verwijdert lock op basis van job_name en lockToken", async () => {
      // For releaseCronLock, delete().eq("job_name",...).eq("locked_by",...)
      const mockEq2 = vi.fn().mockResolvedValue({ error: null });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      mockDelete.mockReturnValue({ eq: mockEq1 });

      const { releaseCronLock } = await import("./lock");
      await releaseCronLock("test-job", "my-token");

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq1).toHaveBeenCalledWith("job_name", "test-job");
      expect(mockEq2).toHaveBeenCalledWith("locked_by", "my-token");
    });
  });

  describe("withCronLock", () => {
    it("voert handler uit wanneer lock is verkregen", async () => {
      mockInsert.mockResolvedValue({ error: null });
      // Mock releaseCronLock chain: delete().eq().eq()
      const mockEq2 = vi.fn().mockResolvedValue({ error: null });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      mockDelete.mockReturnValue({
        eq: mockEq1,
        lt: vi.fn().mockResolvedValue({ error: null }),
      });

      const handler = vi.fn().mockResolvedValue("resultaat");

      const { withCronLock } = await import("./lock");
      const result = await withCronLock("test-job", handler);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(result).toBe("resultaat");
    });

    it("retourneert null en voert handler niet uit als lock niet beschikbaar is", async () => {
      mockInsert.mockResolvedValue({
        error: { code: "23505", message: "duplicate key" },
      });

      const handler = vi.fn().mockResolvedValue("nooit bereikt");

      const { withCronLock } = await import("./lock");
      const result = await withCronLock("busy-job", handler);

      expect(handler).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("geeft lock vrij ook als handler een fout gooit", async () => {
      mockInsert.mockResolvedValue({ error: null });
      const mockEq2 = vi.fn().mockResolvedValue({ error: null });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      mockDelete.mockReturnValue({
        eq: mockEq1,
        lt: vi.fn().mockResolvedValue({ error: null }),
      });

      const handler = vi.fn().mockRejectedValue(new Error("Handler crash"));

      const { withCronLock } = await import("./lock");

      await expect(withCronLock("test-job", handler)).rejects.toThrow(
        "Handler crash"
      );

      // Lock should still be released (finally block)
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
