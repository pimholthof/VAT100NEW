import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  })),
}));

// ─── Tests ───

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET handler bestaat en is aanroepbaar", async () => {
    const { GET } = await import("./route");
    expect(typeof GET).toBe("function");
  });

  it("retourneert { status: 'ok' } voor ongeauthenticeerd verzoek", async () => {
    const { GET } = await import("./route");

    const request = new Request("http://localhost:3000/api/health", {
      method: "GET",
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  it("retourneert geen gedetailleerde checks voor ongeauthenticeerd verzoek", async () => {
    const { GET } = await import("./route");

    const request = new Request("http://localhost:3000/api/health", {
      method: "GET",
    });

    const response = await GET(request);
    const body = await response.json();

    expect(body.checks).toBeUndefined();
  });

  it("retourneert simpele status als CRON_SECRET niet geconfigureerd is", async () => {
    // Without CRON_SECRET env, any auth header is ignored
    delete process.env.CRON_SECRET;

    const { GET } = await import("./route");

    const request = new Request("http://localhost:3000/api/health", {
      method: "GET",
      headers: { authorization: "Bearer some-secret" },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.checks).toBeUndefined();
  });
});
