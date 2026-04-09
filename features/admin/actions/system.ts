"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";
import { sanitizeError } from "@/lib/errors";

export interface AutomationStats {
  period7d: {
    totalProcessed: number;
    totalFailed: number;
    totalPending: number;
    avgAttempts: number;
  };
  byEventType: Array<{
    eventType: string;
    processed: number;
    failed: number;
    pending: number;
  }>;
  recentFailures: Array<{
    id: string;
    eventType: string;
    lastError: string;
    attempts: number;
    createdAt: string;
    failedAt: string;
  }>;
  lastCronPayloads: {
    agents: Record<string, unknown> | null;
    recurring: Record<string, unknown> | null;
    overdue: Record<string, unknown> | null;
    events: Record<string, unknown> | null;
  };
}

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
    lastEventProcessorRun: string | null;
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
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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

    const { data: lastEventProcessorEvent } = await supabase
      .from("system_events")
      .select("created_at")
      .eq("event_type", "cron.events")
      .order("created_at", { ascending: false })
      .limit(1);

    const { count: unprocessedEvents } = await supabase
      .from("system_events")
      .select("*", { count: "exact", head: true })
      .is("processed_at", null)
      .is("failed_at", null);

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
          lastEventProcessorRun: lastEventProcessorEvent?.[0]?.created_at ?? null,
        },
        eventBacklog: unprocessedEvents ?? 0,
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getSystemStatus" }) };
  }
}

export async function getAutomationStats(): Promise<ActionResult<AutomationStats>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 7-day aggregates
    const [
      { count: totalProcessed },
      { count: totalFailed },
      { count: totalPending },
      { data: processedEvents },
    ] = await Promise.all([
      supabase
        .from("system_events")
        .select("*", { count: "exact", head: true })
        .not("processed_at", "is", null)
        .gte("created_at", sevenDaysAgo),
      supabase
        .from("system_events")
        .select("*", { count: "exact", head: true })
        .not("failed_at", "is", null)
        .gte("created_at", sevenDaysAgo),
      supabase
        .from("system_events")
        .select("*", { count: "exact", head: true })
        .is("processed_at", null)
        .is("failed_at", null),
      supabase
        .from("system_events")
        .select("attempts")
        .not("processed_at", "is", null)
        .gte("created_at", sevenDaysAgo),
    ]);

    const avgAttempts =
      processedEvents && processedEvents.length > 0
        ? Math.round(
            (processedEvents.reduce((sum, e) => sum + (e.attempts ?? 1), 0) /
              processedEvents.length) *
              100
          ) / 100
        : 0;

    // Per event_type breakdown — fetch all events from 7d and aggregate in JS
    const { data: allRecent } = await supabase
      .from("system_events")
      .select("event_type, processed_at, failed_at")
      .gte("created_at", sevenDaysAgo);

    const typeMap = new Map<string, { processed: number; failed: number; pending: number }>();
    for (const evt of allRecent ?? []) {
      const key = evt.event_type;
      if (!typeMap.has(key)) typeMap.set(key, { processed: 0, failed: 0, pending: 0 });
      const entry = typeMap.get(key)!;
      if (evt.processed_at) entry.processed++;
      else if (evt.failed_at) entry.failed++;
      else entry.pending++;
    }

    const byEventType = Array.from(typeMap.entries())
      .map(([eventType, counts]) => ({ eventType, ...counts }))
      .sort((a, b) => b.failed - a.failed || b.pending - a.pending);

    // Recent failures (top 10)
    const { data: failures } = await supabase
      .from("system_events")
      .select("id, event_type, last_error, attempts, created_at, failed_at")
      .not("failed_at", "is", null)
      .order("failed_at", { ascending: false })
      .limit(10);

    const recentFailures = (failures ?? []).map((f) => ({
      id: f.id,
      eventType: f.event_type,
      lastError: f.last_error ?? "Onbekende fout",
      attempts: f.attempts ?? 0,
      createdAt: f.created_at,
      failedAt: f.failed_at!,
    }));

    // Last cron payloads
    const cronTypes = ["cron.agents", "cron.recurring", "cron.overdue", "cron.events"] as const;
    const cronResults = await Promise.all(
      cronTypes.map((type) =>
        supabase
          .from("system_events")
          .select("payload")
          .eq("event_type", type)
          .order("created_at", { ascending: false })
          .limit(1)
      )
    );

    const lastCronPayloads = {
      agents: (cronResults[0].data?.[0]?.payload as Record<string, unknown>) ?? null,
      recurring: (cronResults[1].data?.[0]?.payload as Record<string, unknown>) ?? null,
      overdue: (cronResults[2].data?.[0]?.payload as Record<string, unknown>) ?? null,
      events: (cronResults[3].data?.[0]?.payload as Record<string, unknown>) ?? null,
    };

    return {
      error: null,
      data: {
        period7d: {
          totalProcessed: totalProcessed ?? 0,
          totalFailed: totalFailed ?? 0,
          totalPending: totalPending ?? 0,
          avgAttempts,
        },
        byEventType,
        recentFailures,
        lastCronPayloads,
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getAutomationStats" }) };
  }
}
