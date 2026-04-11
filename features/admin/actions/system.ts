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
    lastEventProcessorRun: string | null;
  };
  eventBacklog: number;
}

interface EventTypeStats {
  eventType: string;
  processed: number;
  failed: number;
  pending: number;
  avgAttempts: number;
}

interface PeriodStats {
  totalProcessed: number;
  totalFailed: number;
  totalPending: number;
  avgAttempts: number;
}

interface RecentFailure {
  id: string;
  eventType: string;
  lastError: string;
  attempts: number;
  failedAt: string;
}

export interface AutomationStats {
  period7d: PeriodStats;
  byEventType: EventTypeStats[];
  recentFailures: RecentFailure[];
  lastCronPayloads: {
    agents: Record<string, unknown> | null;
    recurring: Record<string, unknown> | null;
    overdue: Record<string, unknown> | null;
    events: Record<string, unknown> | null;
  };
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

    // Overall stats for 7d period
    const { data: processedEvents } = await supabase
      .from("system_events")
      .select("event_type, attempts")
      .gte("created_at", sevenDaysAgo)
      .not("processed_at", "is", null);

    const { data: failedEvents } = await supabase
      .from("system_events")
      .select("event_type")
      .gte("created_at", sevenDaysAgo)
      .not("failed_at", "is", null);

    const { data: pendingEvents } = await supabase
      .from("system_events")
      .select("event_type")
      .gte("created_at", sevenDaysAgo)
      .is("processed_at", null)
      .is("failed_at", null);

    // Calculate per-event-type stats
    const statsByType = new Map<string, { processed: number; failed: number; pending: number; totalAttempts: number }>();

    for (const event of processedEvents ?? []) {
      const type = event.event_type ?? "unknown";
      const s = statsByType.get(type) ?? { processed: 0, failed: 0, pending: 0, totalAttempts: 0 };
      s.processed++;
      s.totalAttempts += event.attempts ?? 1;
      statsByType.set(type, s);
    }

    for (const event of failedEvents ?? []) {
      const type = event.event_type ?? "unknown";
      const s = statsByType.get(type) ?? { processed: 0, failed: 0, pending: 0, totalAttempts: 0 };
      s.failed++;
      statsByType.set(type, s);
    }

    for (const event of pendingEvents ?? []) {
      const type = event.event_type ?? "unknown";
      const s = statsByType.get(type) ?? { processed: 0, failed: 0, pending: 0, totalAttempts: 0 };
      s.pending++;
      statsByType.set(type, s);
    }

    const totalProcessed = processedEvents?.length ?? 0;
    const totalFailed = failedEvents?.length ?? 0;
    const totalPending = pendingEvents?.length ?? 0;
    const totalAttempts = (processedEvents ?? []).reduce((sum, e) => sum + (e.attempts ?? 1), 0);

    const byEventType: EventTypeStats[] = Array.from(statsByType.entries()).map(([eventType, stats]) => ({
      eventType,
      processed: stats.processed,
      failed: stats.failed,
      pending: stats.pending,
      avgAttempts: stats.processed > 0 ? Math.round((stats.totalAttempts / stats.processed) * 10) / 10 : 0,
    }));

    // Recent failures (last 10)
    const { data: recentFailedEvents } = await supabase
      .from("system_events")
      .select("id, event_type, last_error, attempts, failed_at")
      .not("failed_at", "is", null)
      .order("failed_at", { ascending: false })
      .limit(10);

    const recentFailures: RecentFailure[] = (recentFailedEvents ?? []).map((e) => ({
      id: e.id,
      eventType: e.event_type ?? "unknown",
      lastError: e.last_error ?? "Onbekende fout",
      attempts: e.attempts ?? 1,
      failedAt: e.failed_at ?? "",
    }));

    // Last cron payloads
    const cronTypes = ["cron.agents", "cron.recurring", "cron.overdue", "cron.events"] as const;
    const cronResults = await Promise.all(
      cronTypes.map((type) =>
        supabase
          .from("system_events")
          .select("created_at, payload")
          .eq("event_type", type)
          .order("created_at", { ascending: false })
          .limit(1)
      )
    );

    const toCronPayload = (res: typeof cronResults[number]): Record<string, unknown> | null => {
      const row = res.data?.[0];
      if (!row) return null;
      return (row.payload as Record<string, unknown>) ?? null;
    };

    return {
      error: null,
      data: {
        period7d: {
          totalProcessed,
          totalFailed,
          totalPending,
          avgAttempts: totalProcessed > 0 ? Math.round((totalAttempts / totalProcessed) * 10) / 10 : 0,
        },
        byEventType: byEventType.sort((a, b) => b.processed - a.processed),
        recentFailures,
        lastCronPayloads: {
          agents: toCronPayload(cronResults[0]),
          recurring: toCronPayload(cronResults[1]),
          overdue: toCronPayload(cronResults[2]),
          events: toCronPayload(cronResults[3]),
        },
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getAutomationStats" }) };
  }
}
