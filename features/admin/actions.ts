"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  ActionResult,
  AdminUser,
  AdminUserDetail,
  InvoiceStatus,
  PlatformStats,
} from "@/lib/types";
import { sanitizeError } from "@/lib/errors";

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

// ─── Users List ───

export async function getUsers(filters?: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{ users: AdminUser[]; total: number }>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 25;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Get users with auth email
    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      query = query.or(
        `full_name.ilike.${term},studio_name.ilike.${term}`
      );
    }

    const { data: profiles, count, error } = await query;

    if (error) return { error: sanitizeError(error, { action: "getUsers" }) };

    // Get invoice stats per user
    const userIds = (profiles ?? []).map((p) => p.id);

    const { data: invoiceStats } = await supabase
      .from("invoices")
      .select("user_id, total_inc_vat, status, created_at")
      .in("user_id", userIds.length > 0 ? userIds : ["__none__"]);

    // Get auth emails
    const { data: authData } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });

    const emailMap = new Map<string, string>();
    for (const u of authData?.users ?? []) {
      emailMap.set(u.id, u.email ?? "");
    }

    // Aggregate stats per user
    const statsMap = new Map<
      string,
      { count: number; revenue: number; lastActivity: string | null }
    >();

    for (const inv of invoiceStats ?? []) {
      const existing = statsMap.get(inv.user_id) ?? {
        count: 0,
        revenue: 0,
        lastActivity: null,
      };
      existing.count++;
      if (inv.status === "paid") {
        existing.revenue += Number(inv.total_inc_vat) || 0;
      }
      if (
        !existing.lastActivity ||
        inv.created_at > existing.lastActivity
      ) {
        existing.lastActivity = inv.created_at;
      }
      statsMap.set(inv.user_id, existing);
    }

    const users: AdminUser[] = (profiles ?? []).map((p) => {
      const stats = statsMap.get(p.id);
      return {
        id: p.id,
        full_name: p.full_name,
        studio_name: p.studio_name,
        email: emailMap.get(p.id) ?? "",
        role: p.role ?? "user",
        status: p.status ?? "active",
        created_at: p.created_at,
        invoice_count: stats?.count ?? 0,
        total_revenue: Math.round((stats?.revenue ?? 0) * 100) / 100,
        last_activity: stats?.lastActivity ?? null,
      };
    });

    return {
      error: null,
      data: { users, total: count ?? 0 },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getUsers" }) };
  }
}

// ─── User Detail ───

export async function getUserDetail(
  userId: string
): Promise<ActionResult<AdminUserDetail>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();

    const [profileResult, invoicesResult, clientsResult, receiptsResult] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase
          .from("invoices")
          .select(
            "id, invoice_number, status, issue_date, total_inc_vat, client:clients(name)"
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("receipts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);

    if (profileResult.error || !profileResult.data) {
      return { error: "Gebruiker niet gevonden." };
    }

    // Get auth email
    const { data: authData } = await supabase.auth.admin.getUserById(userId);
    const email = authData?.user?.email ?? "";

    const invoices = invoicesResult.data ?? [];

    const totalRevenue = invoices
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + (Number(i.total_inc_vat) || 0), 0);

    const openInvoices = invoices.filter(
      (i) => i.status === "sent" || i.status === "overdue"
    );
    const openAmount = openInvoices.reduce(
      (sum, i) => sum + (Number(i.total_inc_vat) || 0),
      0
    );

    const profile = profileResult.data;

    const recentInvoices = invoices.slice(0, 10).map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      status: inv.status as InvoiceStatus,
      issue_date: inv.issue_date,
      total_inc_vat: Number(inv.total_inc_vat) || 0,
      client_name:
        (inv.client as unknown as { name: string })?.name ?? "—",
    }));

    return {
      error: null,
      data: {
        profile: {
          ...profile,
          role: profile.role ?? "user",
          status: profile.status ?? "active",
          email,
        },
        stats: {
          totalInvoices: invoices.length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          openInvoices: openInvoices.length,
          openAmount: Math.round(openAmount * 100) / 100,
          totalClients: clientsResult.count ?? 0,
          totalReceipts: receiptsResult.count ?? 0,
        },
        recentInvoices,
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getUserDetail", userId }) };
  }
}

// ─── User Account Actions ───

export async function suspendUser(userId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  // Prevent self-suspension
  if (userId === auth.user.id) {
    return { error: "Je kunt je eigen account niet deactiveren." };
  }

  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("profiles")
      .update({ status: "suspended" })
      .eq("id", userId);

    if (error) return { error: sanitizeError(error, { action: "suspendUser" }) };
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "suspendUser", userId }) };
  }
}

export async function reactivateUser(userId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("profiles")
      .update({ status: "active" })
      .eq("id", userId);

    if (error) return { error: sanitizeError(error, { action: "reactivateUser" }) };
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "reactivateUser", userId }) };
  }
}
