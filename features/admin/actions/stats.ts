"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  ActionResult,
  PlatformStats,
} from "@/lib/types";
import { sanitizeError } from "@/lib/errors";


// ─── Activity Feed ───

export interface ActivityFeedItem {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export async function getRecentActivityFeed(): Promise<ActionResult<ActivityFeedItem[]>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("system_events")
      .select("id, event_type, payload, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) return { error: sanitizeError(error, { action: "getRecentActivityFeed" }) };
    return { error: null, data: data ?? [] };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getRecentActivityFeed" }) };
  }
}

// ─── Platform Stats ───

export async function getPlatformStats(): Promise<ActionResult<PlatformStats>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    const [
      { count: totalUsers },
      { count: newUsersThisMonth },
      { count: totalInvoices },
      { data: revenueData },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthStart),
      supabase
        .from("invoices")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("invoices")
        .select("total_inc_vat")
        .eq("status", "paid"),
    ]);

    const totalRevenue = (revenueData ?? []).reduce(
      (sum, inv) => sum + (Number(inv.total_inc_vat) || 0),
      0
    );

    // Active users = users with at least 1 invoice in last 30 days
    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: activeData } = await supabase
      .from("invoices")
      .select("user_id")
      .gte("created_at", thirtyDaysAgo);

    const activeUsers = new Set(
      (activeData ?? []).map((i) => i.user_id)
    ).size;

    return {
      error: null,
      data: {
        totalUsers: totalUsers ?? 0,
        activeUsers,
        totalInvoices: totalInvoices ?? 0,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        newUsersThisMonth: newUsersThisMonth ?? 0,
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getPlatformStats" }) };
  }
}

export type RevenueMetrics = {
  mrr_cents: number;
  conversion_rate: number;
  pipeline_value_cents: number;
  active_subscriptions: number;
};

export async function getRevenueMetrics(): Promise<ActionResult<RevenueMetrics>> {
  try {
    const supabase = createServiceClient();

    // 1. Calculate MRR & Active Subscriptions
    const { data: subsData, error: subsError } = await supabase
      .from("subscriptions")
      .select("*, plan:plans(*)")
      .eq("status", "active");

    if (subsError) throw subsError;

    const mrr_cents = subsData?.reduce((acc, sub: Record<string, unknown>) => acc + ((sub.plan as Record<string, unknown>)?.price_cents as number || 0), 0) || 0;
    const active_subscriptions = subsData?.length || 0;

    // 2. Calculate Conversion Rate
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("lifecycle_stage");

    if (leadsError) throw leadsError;

    const totalLeads = leads?.length || 0;
    const customers = leads?.filter(l => l.lifecycle_stage === "Klant").length || 0;
    const conversion_rate = totalLeads > 0 ? (customers / totalLeads) * 100 : 0;

    // 3. Calculate Pipeline Value (leads with plan chosen or link sent)
    const { data: pipelineLeads, error: pipeError } = await supabase
      .from("leads")
      .select("target_plan_id, plans!target_plan_id(*)")
      .in("lifecycle_stage", ["Link Verstuurd", "Plan Gekozen"]);

    if (pipeError) throw pipeError;

    const pipeline_value_cents = pipelineLeads?.reduce((acc, lead: Record<string, unknown>) => {
      return acc + ((lead.plans as Record<string, unknown>)?.price_cents as number || 0);
    }, 0) || 0;

    return {
      error: null,
      data: {
        mrr_cents,
        conversion_rate: Math.round(conversion_rate),
        pipeline_value_cents,
        active_subscriptions
      }
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getRevenueMetrics" }) };
  }
}

// ─── Admin Dashboard Aggregator ───

export interface AdminAlert {
  type: "inactive" | "suspended" | "incomplete" | "overdue" | "leads_stale";
  count: number;
  message: string;
  href: string;
}

export interface AdminLeadRow {
  id: string;
  name: string;
  email: string;
  source: string;
  lifecycle_stage: string;
  created_at: string;
}

export interface AdminCustomerRow {
  id: string;
  name: string;
  email: string;
  status: string;
  total_revenue: number;
  last_activity: string | null;
  created_at: string;
}

export interface AdminDashboardData {
  kpis: {
    totalCustomers: number;
    activeCustomers: number;
    totalLeads: number;
    totalRevenue: number;
    openAmount: number;
  };
  alerts: AdminAlert[];
  recentLeads: AdminLeadRow[];
  recentCustomers: AdminCustomerRow[];
  quickActionsData: {
    suspendedCount: number;
    overdueCount: number;
    waitlistCount: number;
  };
  lastUpdated: string;
}

export async function getAdminDashboardData(): Promise<ActionResult<AdminDashboardData>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalCustomers },
      { count: suspendedCount },
      { data: incompleteProfiles },
      { data: allLeads },
      { data: recentLeadsData },
      { data: paidInvoices },
      { data: overdueInvoices },
      { data: recentInvoiceActivity },
      { count: waitlistCount },
      { data: recentProfilesData },
      { data: authData },
    ] = await Promise.all([
      // Total customers (non-admin profiles)
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .neq("role", "admin"),
      // Suspended
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "suspended"),
      // Incomplete profiles (missing IBAN, BTW, or KVK)
      supabase
        .from("profiles")
        .select("id")
        .neq("role", "admin")
        .or("iban.is.null,btw_number.is.null,kvk_number.is.null"),
      // All leads (for count)
      supabase
        .from("leads")
        .select("id, lifecycle_stage, created_at"),
      // Recent 5 leads
      supabase
        .from("leads")
        .select("id, email, first_name, last_name, company_name, source, lifecycle_stage, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      // Paid invoices (revenue)
      supabase
        .from("invoices")
        .select("total_inc_vat")
        .eq("status", "paid"),
      // Overdue invoices
      supabase
        .from("invoices")
        .select("total_inc_vat")
        .eq("status", "overdue"),
      // Recent invoice activity per user (for inactive detection)
      supabase
        .from("invoices")
        .select("user_id, created_at")
        .gte("created_at", fourteenDaysAgo),
      // Waitlist count
      supabase
        .from("waitlist")
        .select("*", { count: "exact", head: true }),
      // Recent 5 customers
      supabase
        .from("profiles")
        .select("id, full_name, studio_name, status, created_at")
        .neq("role", "admin")
        .order("created_at", { ascending: false })
        .limit(5),
      // Auth emails
      supabase.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    // Email map
    const emailMap = new Map<string, string>();
    for (const u of authData?.users ?? []) {
      emailMap.set(u.id, u.email ?? "");
    }

    // KPIs
    const totalRevenue = (paidInvoices ?? []).reduce(
      (sum, inv) => sum + (Number(inv.total_inc_vat) || 0), 0
    );
    const openAmount = (overdueInvoices ?? []).reduce(
      (sum, inv) => sum + (Number(inv.total_inc_vat) || 0), 0
    );

    // Active customers = users with invoice activity in last 14 days
    const activeUserIds = new Set((recentInvoiceActivity ?? []).map((i) => i.user_id));
    const activeCustomers = activeUserIds.size;

    // Inactive: active profiles without recent invoice activity
    const { data: activeProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("status", "active")
      .neq("role", "admin");

    const inactiveCount = (activeProfiles ?? []).filter(
      (p) => !activeUserIds.has(p.id)
    ).length;

    // Stale leads: "Nieuw" older than 3 days
    const staleLeadsCount = (allLeads ?? []).filter(
      (l) => l.lifecycle_stage === "Nieuw" && l.created_at < threeDaysAgo
    ).length;

    // Build alerts (max 5, only include non-zero)
    const alerts: AdminAlert[] = [];
    if (inactiveCount > 0) {
      alerts.push({
        type: "inactive",
        count: inactiveCount,
        message: `${inactiveCount} klant${inactiveCount !== 1 ? "en" : ""} zonder activiteit (14 dagen)`,
        href: "/admin/users",
      });
    }
    if ((suspendedCount ?? 0) > 0) {
      alerts.push({
        type: "suspended",
        count: suspendedCount ?? 0,
        message: `${suspendedCount} account${(suspendedCount ?? 0) !== 1 ? "s" : ""} geblokkeerd`,
        href: "/admin/users",
      });
    }
    if ((incompleteProfiles ?? []).length > 0) {
      const cnt = incompleteProfiles!.length;
      alerts.push({
        type: "incomplete",
        count: cnt,
        message: `${cnt} profiel${cnt !== 1 ? "en" : ""} incompleet`,
        href: "/admin/customers",
      });
    }
    if ((overdueInvoices ?? []).length > 0) {
      const cnt = overdueInvoices!.length;
      alerts.push({
        type: "overdue",
        count: cnt,
        message: `${cnt} factuu${cnt !== 1 ? "r" : "ren"} openstaand — ${new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(openAmount)}`,
        href: "/admin/customers",
      });
    }
    if (staleLeadsCount > 0) {
      alerts.push({
        type: "leads_stale",
        count: staleLeadsCount,
        message: `${staleLeadsCount} nieuwe lead${staleLeadsCount !== 1 ? "s" : ""} zonder opvolging`,
        href: "/admin/pipeline",
      });
    }

    // Recent leads
    const recentLeads: AdminLeadRow[] = (recentLeadsData ?? []).map((l) => ({
      id: l.id,
      name: [l.first_name, l.last_name].filter(Boolean).join(" ") || l.company_name || l.email,
      email: l.email,
      source: l.source,
      lifecycle_stage: l.lifecycle_stage,
      created_at: l.created_at,
    }));

    // Recent customers with invoice stats
    const { data: customerInvoiceStats } = await supabase
      .from("invoices")
      .select("user_id, total_inc_vat, status, created_at")
      .in("user_id", (recentProfilesData ?? []).map((p) => p.id).filter(Boolean));

    const customerStatsMap = new Map<string, { revenue: number; lastActivity: string | null }>();
    for (const inv of customerInvoiceStats ?? []) {
      const existing = customerStatsMap.get(inv.user_id) ?? { revenue: 0, lastActivity: null };
      if (inv.status === "paid") existing.revenue += Number(inv.total_inc_vat) || 0;
      if (!existing.lastActivity || inv.created_at > existing.lastActivity) existing.lastActivity = inv.created_at;
      customerStatsMap.set(inv.user_id, existing);
    }

    const recentCustomers: AdminCustomerRow[] = (recentProfilesData ?? []).map((p) => {
      const stats = customerStatsMap.get(p.id);
      return {
        id: p.id,
        name: p.full_name || p.studio_name || "Naamloos",
        email: emailMap.get(p.id) ?? "",
        status: p.status ?? "active",
        total_revenue: Math.round((stats?.revenue ?? 0) * 100) / 100,
        last_activity: stats?.lastActivity ?? null,
        created_at: p.created_at,
      };
    });

    return {
      error: null,
      data: {
        kpis: {
          totalCustomers: totalCustomers ?? 0,
          activeCustomers,
          totalLeads: (allLeads ?? []).length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          openAmount: Math.round(openAmount * 100) / 100,
        },
        alerts: alerts.slice(0, 5),
        recentLeads,
        recentCustomers,
        quickActionsData: {
          suspendedCount: suspendedCount ?? 0,
          overdueCount: (overdueInvoices ?? []).length,
          waitlistCount: waitlistCount ?? 0,
        },
        lastUpdated: now.toISOString(),
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getAdminDashboardData" }) };
  }
}

// ─── Page KPI Stats ───

export interface PageKpis {
  items: { label: string; value: number; isCurrency?: boolean }[];
}

export async function getCustomerKpis(): Promise<ActionResult<PageKpis>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();

    const [
      { count: total },
      { count: activeCount },
      { count: suspendedCount },
      { data: revenueData },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).neq("role", "admin"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).neq("role", "admin").eq("status", "active"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "suspended"),
      supabase.from("invoices").select("total_inc_vat").eq("status", "paid"),
    ]);

    const totalRevenue = (revenueData ?? []).reduce(
      (sum, inv) => sum + (Number(inv.total_inc_vat) || 0), 0
    );

    return {
      error: null,
      data: {
        items: [
          { label: "Totaal klanten", value: total ?? 0 },
          { label: "Actief", value: activeCount ?? 0 },
          { label: "Totale omzet", value: Math.round(totalRevenue * 100) / 100, isCurrency: true },
          { label: "Geblokkeerd", value: suspendedCount ?? 0 },
        ],
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getCustomerKpis" }) };
  }
}

export async function getUserKpis(): Promise<ActionResult<PageKpis>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

    const [
      { count: total },
      { count: activeCount },
      { count: suspendedCount },
      { count: newThisMonth },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "suspended"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", monthStart),
    ]);

    return {
      error: null,
      data: {
        items: [
          { label: "Totaal gebruikers", value: total ?? 0 },
          { label: "Actief", value: activeCount ?? 0 },
          { label: "Geblokkeerd", value: suspendedCount ?? 0 },
          { label: "Nieuw deze maand", value: newThisMonth ?? 0 },
        ],
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getUserKpis" }) };
  }
}

export async function getWaitlistKpis(): Promise<ActionResult<PageKpis>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

    const [
      { count: total },
      { count: thisWeek },
      { count: thisMonth },
    ] = await Promise.all([
      supabase.from("waitlist").select("*", { count: "exact", head: true }),
      supabase.from("waitlist").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
      supabase.from("waitlist").select("*", { count: "exact", head: true }).gte("created_at", monthStart),
    ]);

    return {
      error: null,
      data: {
        items: [
          { label: "Totaal aanmeldingen", value: total ?? 0 },
          { label: "Deze week", value: thisWeek ?? 0 },
          { label: "Deze maand", value: thisMonth ?? 0 },
        ],
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getWaitlistKpis" }) };
  }
}
