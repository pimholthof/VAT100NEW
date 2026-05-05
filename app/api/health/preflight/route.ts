import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { validateEnv, checkServiceKeyExposure } from "@/lib/env";

export const dynamic = "force-dynamic";

interface Check {
  name: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

async function checkDatabase(): Promise<Check> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);
    if (error) {
      return { name: "supabase.database", status: "fail", detail: error.message };
    }
    return { name: "supabase.database", status: "pass", detail: "profiles query ok" };
  } catch (e) {
    return { name: "supabase.database", status: "fail", detail: String(e) };
  }
}

async function checkAuth(): Promise<Check> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.auth.admin.listUsers({ perPage: 1 });
    if (error) {
      return { name: "supabase.auth", status: "fail", detail: error.message };
    }
    return { name: "supabase.auth", status: "pass", detail: "service-role can list users" };
  } catch (e) {
    return { name: "supabase.auth", status: "fail", detail: String(e) };
  }
}

async function checkMollie(): Promise<Check[]> {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) {
    return [{ name: "mollie.key", status: "fail", detail: "MOLLIE_API_KEY ontbreekt" }];
  }

  const isLive = apiKey.startsWith("live_");
  const isTest = apiKey.startsWith("test_");
  const modeCheck: Check = !isLive && !isTest
    ? { name: "mollie.mode", status: "fail", detail: "MOLLIE_API_KEY heeft geen herkenbare prefix (live_/test_)" }
    : { name: "mollie.mode", status: isLive ? "pass" : "warn", detail: isLive ? "live mode" : "test mode" };

  try {
    const res = await fetch("https://api.mollie.com/v2/methods", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    const apiCheck: Check = res.ok
      ? { name: "mollie.api", status: "pass", detail: "GET /v2/methods 200" }
      : { name: "mollie.api", status: "fail", detail: `GET /v2/methods ${res.status}` };
    return [modeCheck, apiCheck];
  } catch (e) {
    return [modeCheck, { name: "mollie.api", status: "fail", detail: String(e) }];
  }
}

async function checkResend(): Promise<Check[]> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey) {
    return [{ name: "resend.key", status: "fail", detail: "RESEND_API_KEY ontbreekt" }];
  }
  if (!from) {
    return [{ name: "resend.from", status: "fail", detail: "EMAIL_FROM ontbreekt" }];
  }

  const fromDomain = from.split("@")[1]?.toLowerCase();
  if (!fromDomain) {
    return [{ name: "resend.from", status: "fail", detail: `EMAIL_FROM '${from}' is geen valide adres` }];
  }

  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return [{ name: "resend.domains", status: "fail", detail: `GET /domains ${res.status}` }];
    }
    const body = (await res.json()) as { data?: Array<{ name?: string; status?: string }> };
    const domains = body.data ?? [];
    const match = domains.find((d) => d.name?.toLowerCase() === fromDomain);
    if (!match) {
      return [{
        name: "resend.from-domain",
        status: "fail",
        detail: `Domein ${fromDomain} ontbreekt in Resend-account`,
      }];
    }
    if (match.status !== "verified") {
      return [{
        name: "resend.from-domain",
        status: "fail",
        detail: `Domein ${fromDomain} status is '${match.status}', niet 'verified'`,
      }];
    }
    return [{ name: "resend.from-domain", status: "pass", detail: `${fromDomain} verified` }];
  } catch (e) {
    return [{ name: "resend.domains", status: "fail", detail: String(e) }];
  }
}

function checkAnthropic(): Check {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { name: "anthropic.key", status: "fail", detail: "ANTHROPIC_API_KEY ontbreekt" };
  if (!key.startsWith("sk-ant-")) {
    return { name: "anthropic.key", status: "fail", detail: "ANTHROPIC_API_KEY heeft niet het sk-ant- formaat" };
  }
  if (key.length < 50) {
    return { name: "anthropic.key", status: "warn", detail: "ANTHROPIC_API_KEY is korter dan verwacht" };
  }
  return { name: "anthropic.key", status: "pass", detail: "format-check ok (live-call wordt vermeden om credits te sparen)" };
}

function checkAppUrl(): Check {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) return { name: "app.url", status: "fail", detail: "NEXT_PUBLIC_APP_URL ontbreekt" };
  if (!url.startsWith("https://")) {
    return { name: "app.url", status: "fail", detail: `NEXT_PUBLIC_APP_URL '${url}' is geen https://` };
  }
  if (url.includes("localhost") || url.endsWith(".vercel.app")) {
    return { name: "app.url", status: "warn", detail: `NEXT_PUBLIC_APP_URL '${url}' lijkt geen productie-domein` };
  }
  return { name: "app.url", status: "pass", detail: url };
}

function checkEnv(): Check[] {
  const result = validateEnv();
  const exposure = checkServiceKeyExposure();
  const checks: Check[] = [];

  if (result.missing.length === 0) {
    checks.push({ name: "env.required", status: "pass", detail: "alle vereiste env-vars aanwezig" });
  } else {
    checks.push({
      name: "env.required",
      status: "fail",
      detail: `ontbrekend: ${result.missing.join(", ")}`,
    });
  }

  for (const issue of exposure) {
    checks.push({
      name: "env.exposure",
      status: issue.startsWith("CRITICAL") ? "fail" : "warn",
      detail: issue,
    });
  }

  for (const w of result.warnings) {
    checks.push({ name: "env.warning", status: "warn", detail: w });
  }

  return checks;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isAuthorized = !!cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Unauthorized — provide Bearer CRON_SECRET" },
      { status: 401 },
    );
  }

  const checks: Check[] = [];

  checks.push(...checkEnv());
  checks.push(checkAppUrl());
  checks.push(checkAnthropic());

  const [db, auth, mollie, resend] = await Promise.all([
    checkDatabase(),
    checkAuth(),
    checkMollie(),
    checkResend(),
  ]);
  checks.push(db, auth, ...mollie, ...resend);

  const fail = checks.filter((c) => c.status === "fail");
  const warn = checks.filter((c) => c.status === "warn");
  const overall: "pass" | "warn" | "fail" = fail.length > 0 ? "fail" : warn.length > 0 ? "warn" : "pass";

  return NextResponse.json(
    {
      overall,
      summary: {
        pass: checks.filter((c) => c.status === "pass").length,
        warn: warn.length,
        fail: fail.length,
      },
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: overall === "fail" ? 503 : 200 },
  );
}
