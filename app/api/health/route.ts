import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "down";
  latency_ms: number;
  error?: string;
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);
    return {
      name: "database",
      status: error ? "degraded" : "healthy",
      latency_ms: Date.now() - start,
      ...(error && { error: error.message }),
    };
  } catch (e) {
    return { name: "database", status: "down", latency_ms: Date.now() - start, error: String(e) };
  }
}

async function checkAuth(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.auth.admin.listUsers({ perPage: 1 });
    return {
      name: "auth",
      status: error ? "degraded" : "healthy",
      latency_ms: Date.now() - start,
      ...(error && { error: error.message }),
    };
  } catch (e) {
    return { name: "auth", status: "down", latency_ms: Date.now() - start, error: String(e) };
  }
}

async function checkMollie(): Promise<HealthCheck> {
  const start = Date.now();
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) {
    return { name: "mollie", status: "degraded", latency_ms: 0, error: "API key not configured" };
  }
  try {
    const res = await fetch("https://api.mollie.com/v2/methods", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    return {
      name: "mollie",
      status: res.ok ? "healthy" : "degraded",
      latency_ms: Date.now() - start,
      ...(!res.ok && { error: `HTTP ${res.status}` }),
    };
  } catch (e) {
    return { name: "mollie", status: "down", latency_ms: Date.now() - start, error: String(e) };
  }
}

async function checkResend(): Promise<HealthCheck> {
  const start = Date.now();
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { name: "resend", status: "degraded", latency_ms: 0, error: "API key not configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    return {
      name: "resend",
      status: res.ok ? "healthy" : "degraded",
      latency_ms: Date.now() - start,
      ...(!res.ok && { error: `HTTP ${res.status}` }),
    };
  } catch (e) {
    return { name: "resend", status: "down", latency_ms: Date.now() - start, error: String(e) };
  }
}

async function checkTink(): Promise<HealthCheck> {
  const start = Date.now();
  const clientId = process.env.TINK_CLIENT_ID;
  const clientSecret = process.env.TINK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { name: "tink", status: "degraded", latency_ms: 0, error: "Credentials not configured" };
  }
  try {
    const res = await fetch("https://api.tink.com/api/v1/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
        scope: "authorization:read",
      }),
      signal: AbortSignal.timeout(5000),
    });
    return {
      name: "tink",
      status: res.ok ? "healthy" : "degraded",
      latency_ms: Date.now() - start,
      ...(!res.ok && { error: `HTTP ${res.status}` }),
    };
  } catch (e) {
    return { name: "tink", status: "down", latency_ms: Date.now() - start, error: String(e) };
  }
}

async function checkAnthropic(): Promise<HealthCheck> {
  const start = Date.now();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { name: "anthropic", status: "degraded", latency_ms: 0, error: "API key not configured" };
  }
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(5000),
    });
    return {
      name: "anthropic",
      status: res.ok ? "healthy" : "degraded",
      latency_ms: Date.now() - start,
      ...(!res.ok && { error: `HTTP ${res.status}` }),
    };
  } catch (e) {
    return { name: "anthropic", status: "down", latency_ms: Date.now() - start, error: String(e) };
  }
}

export async function GET(request: Request) {
  // Require CRON_SECRET or admin auth for detailed health info
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;

  // Public callers only get a simple status
  if (!isAuthorized) {
    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  }

  const checks = await Promise.all([
    checkDatabase(),
    checkAuth(),
    checkMollie(),
    checkResend(),
    checkTink(),
    checkAnthropic(),
  ]);

  const hasDown = checks.some((c) => c.status === "down");
  const hasDegraded = checks.some((c) => c.status === "degraded");
  const overallStatus = hasDown ? "down" : hasDegraded ? "degraded" : "healthy";

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks: Object.fromEntries(checks.map((c) => [c.name, c])),
  };

  return NextResponse.json(response, {
    status: overallStatus === "down" ? 503 : 200,
  });
}
