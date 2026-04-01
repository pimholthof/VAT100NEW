"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  ActionResult,
  AdminOverview,
  AdminUser,
  AdminUserDetail,
  InvoiceStatus,
} from "@/lib/types";
import { sanitizeError } from "@/lib/errors";
import { logAdminAction } from "@/lib/admin/audit";


export async function getAdminOverview(): Promise<ActionResult<AdminOverview>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const weekStart = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const [
      totalUsersResult,
      newUsersThisMonthResult,
      usersThisWeekResult,
      suspendedUsersResult,
      totalInvoicesResult,
      paidInvoicesResult,
      overdueInvoicesResult,
      activeInvoicesResult,
      waitlistCountResult,
      recentUsersResult,
      recentWaitlistResult,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthStart),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekStart),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "suspended"),
      supabase
        .from("invoices")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("invoices")
        .select("total_inc_vat")
        .eq("status", "paid"),
      supabase
        .from("invoices")
        .select("total_inc_vat", { count: "exact" })
        .eq("status", "overdue"),
      supabase
        .from("invoices")
        .select("user_id")
        .gte("created_at", thirtyDaysAgo),
      supabase
        .from("waitlist")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id, full_name, studio_name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("waitlist")
        .select("id, email, name, referral, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (totalUsersResult.error) throw totalUsersResult.error;
    if (newUsersThisMonthResult.error) throw newUsersThisMonthResult.error;
    if (usersThisWeekResult.error) throw usersThisWeekResult.error;
    if (suspendedUsersResult.error) throw suspendedUsersResult.error;
    if (totalInvoicesResult.error) throw totalInvoicesResult.error;
    if (paidInvoicesResult.error) throw paidInvoicesResult.error;
    if (overdueInvoicesResult.error) throw overdueInvoicesResult.error;
    if (activeInvoicesResult.error) throw activeInvoicesResult.error;
    if (waitlistCountResult.error) throw waitlistCountResult.error;
    if (recentUsersResult.error) throw recentUsersResult.error;
    if (recentWaitlistResult.error) throw recentWaitlistResult.error;

    const totalRevenue = (paidInvoicesResult.data ?? []).reduce(
      (sum, inv) => sum + (Number(inv.total_inc_vat) || 0),
      0
    );
    const overdueAmount = (overdueInvoicesResult.data ?? []).reduce(
      (sum, inv) => sum + (Number(inv.total_inc_vat) || 0),
      0
    );
    const activeUsers = new Set(
      (activeInvoicesResult.data ?? []).map((invoice) => invoice.user_id)
    ).size;

    return {
      error: null,
      data: {
        stats: {
          totalUsers: totalUsersResult.count ?? 0,
          activeUsers,
          totalInvoices: totalInvoicesResult.count ?? 0,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          newUsersThisMonth: newUsersThisMonthResult.count ?? 0,
          suspendedUsers: suspendedUsersResult.count ?? 0,
          waitlistCount: waitlistCountResult.count ?? 0,
          usersThisWeek: usersThisWeekResult.count ?? 0,
          overdueInvoices: overdueInvoicesResult.count ?? 0,
          overdueAmount: Math.round(overdueAmount * 100) / 100,
        },
        recentUsers: (recentUsersResult.data ?? []).map((user) => ({
          id: user.id,
          full_name: user.full_name,
          studio_name: user.studio_name,
          status: user.status ?? "active",
          created_at: user.created_at,
        })),
        recentWaitlist: recentWaitlistResult.data ?? [],
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getAdminOverview" }) };
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
    await logAdminAction(auth.user.id, "user.suspend", "user", userId);
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
    await logAdminAction(auth.user.id, "user.reactivate", "user", userId);
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "reactivateUser", userId }) };
  }
}
