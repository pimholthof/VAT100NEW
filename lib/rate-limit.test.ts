import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase before importing
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => Promise.resolve({ count: 0, error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      delete: vi.fn(() => ({
        lt: vi.fn(() => ({
          then: vi.fn(),
        })),
      })),
    })),
  })),
}));

describe("rate-limit", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should export isRateLimited function", async () => {
    const mod = await import("./rate-limit");
    expect(typeof mod.isRateLimited).toBe("function");
  });
});
