"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";
import { sanitizeError } from "@/lib/errors";

export interface SystemStatus {
  health: {
    status: string;
    checks: Record<string, { name: string; status: string; latency_ms: number; error?: string }>;
    timestamp: string;
  } | null;
  database: {
    profiles: number;
    invoices: number;
    receipts: number;
    leads: number;
    subscriptions: number;
    auditLogEntries: number;
  };
  activity: {
    activeUsersLast24h: number;
    activeUsersLast7d: number;
    invoicesLast24h: number;
    invoicesLast7d: number;
  };
  crons: {
    lastAgentRun: string | null;
    lastOverdueRun: string | null;
    lastRecurringRun: string | null;
  };
  eventBacklog: number;
}

export async function getSystemStatus(): Promise<ActionResult<SystemStatus>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch health from our own endpoint
    let health: SystemStatus["health"] = null;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vat100.nl";
      const res = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(10000) });
      health = await res.json();
    } catch {
      // Health endpoint may not be reachable during SSR
    }

    // Database counts
    const [
      { count: profiles },
      { count: invoices },
      { count: receipts },
      { count: leads },
      { count: subscriptions },
      { count: auditLogEntries },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("invoices").select("*", { count: "exact", head: true }),
      supabase.from("receipts").select("*", { count: "exact", head: true }),
      supabase.from("leads").select("*", { count: "exact", head: true }),
      supabase.from("subscriptions").select("*", { count: "exact", head: true }),
      supabase.from("admin_audit_log").select("*", { count: "exact", head: true }),
    ]);

    // Activity metrics
    const [
      { data: activeUsers24h },
      { data: activeUsers7d },
      { count: invoices24h },
      { count: invoices7d },
    ] = await Promise.all([
      supabase.from("invoices").select("user_id").gte("created_at", oneDayAgo),
      supabase.from("invoices").select("user_id").gte("created_at", sevenDaysAgo),
      supabase.from("invoices").select("*", { count: "exact", head: true }).gte("created_at", oneDayAgo),
      supabase.from("invoices").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    ]);

    // Last cron runs from system_events
    const { data: lastAgentEvent } = await supabase
      .from("system_events")
      .select("created_at")
      .eq("event_type", "cron.agents")
      .order("created_at", { ascending: false })
      .limit(1);

    const { data: lastOverdueEvent } = await supabase
      .from("system_events")
      .select("created_at")
      .eq("event_type", "cron.overdue")
      .order("created_at", { ascending: false })
      .limit(1);

    const { data: lastRecurringEvent } = await supabase
      .from("system_events")
      .select("created_at")
      .eq("event_type", "cron.recurring")
      .order("created_at", { ascending: false })
      .limit(1);

    const { count: unprocessedEvents } = await supabase
      .from("system_events")
      .select("*", { count: "exact", head: true })
      .is("processed_at", null);

    return {
      error: null,
      data: {
        health,
        database: {
          profiles: profiles ?? 0,
          invoices: invoices ?? 0,
          receipts: receipts ?? 0,
          leads: leads ?? 0,
          subscriptions: subscriptions ?? 0,
          auditLogEntries: auditLogEntries ?? 0,
        },
        activity: {
          activeUsersLast24h: new Set((activeUsers24h ?? []).map((i) => i.user_id)).size,
          activeUsersLast7d: new Set((activeUsers7d ?? []).map((i) => i.user_id)).size,
          invoicesLast24h: invoices24h ?? 0,
          invoicesLast7d: invoices7d ?? 0,
        },
        crons: {
          lastAgentRun: lastAgentEvent?.[0]?.created_at ?? null,
          lastOverdueRun: lastOverdueEvent?.[0]?.created_at ?? null,
          lastRecurringRun: lastRecurringEvent?.[0]?.created_at ?? null,
        },
        eventBacklog: unprocessedEvents ?? 0,
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getSystemStatus" }) };
  }
}
