"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email/send-onboarding";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  ActionResult,
  AdminUser,
  AdminUserDetail,
  InvoiceStatus,
  PlatformStats,
  Lead,
  LeadLifecycle,
} from "@/lib/types";
import { sanitizeError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { 
  createMollieCustomer, 
  createFirstPayment 
} from "@/lib/payments/mollie-subscriptions";


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

// ─── Waitlist ───

export interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  referral: string | null;
  created_at: string;
}

export async function getWaitlist(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{ entries: WaitlistEntry[]; total: number }>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("waitlist")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      query = query.or(`email.ilike.${term},name.ilike.${term}`);
    }

    const { data, count, error } = await query;

    if (error) return { error: sanitizeError(error, { action: "getWaitlist" }) };

    return {
      error: null,
      data: {
        entries: (data ?? []) as WaitlistEntry[],
        total: count ?? 0,
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getWaitlist" }) };
  }
}

export async function getWaitlistCount(): Promise<ActionResult<number>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { count, error } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    if (error) return { error: sanitizeError(error, { action: "getWaitlistCount" }) };
    return { error: null, data: count ?? 0 };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getWaitlistCount" }) };
  }
}

// ─── Lead Pipeline ───

export async function getLeads(): Promise<ActionResult<Lead[]>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return { error: sanitizeError(error, { action: "getLeads" }) };

    return {
      error: null,
      data: data as Lead[],
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getLeads" }) };
  }
}

export async function updateLeadStage(
  leadId: string,
  newStage: LeadLifecycle
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("leads")
      .update({ lifecycle_stage: newStage, updated_at: new Date().toISOString() })
      .eq("id", leadId);

    if (error) return { error: sanitizeError(error, { action: "updateLeadStage" }) };

    // Revalidate the admin pipeline view
    revalidatePath("/admin");
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "updateLeadStage" }) };
  }
}

// ─── Lead Dossier ───

export async function getLeadDetail(id: string): Promise<ActionResult<Lead>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return { error: sanitizeError(error, { action: "getLeadDetail" }) };
    return { error: null, data: data as Lead };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getLeadDetail" }) };
  }
}

export async function getLeadActivities(leadId: string): Promise<ActionResult<Record<string, unknown>[]>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("lead_activities")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) return { error: sanitizeError(error, { action: "getLeadActivities" }) };
    return { error: null, data: data || [] };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getLeadActivities" }) };
  }
}

export async function getLeadTasks(leadId: string): Promise<ActionResult<Record<string, unknown>[]>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("lead_tasks")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });

    if (error) return { error: sanitizeError(error, { action: "getLeadTasks" }) };
    return { error: null, data: data || [] };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getLeadTasks" }) };
  }
}

export async function toggleLeadTask(taskId: string, completed: boolean): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("lead_tasks")
      .update({ 
        completed, 
        completed_at: completed ? new Date().toISOString() : null 
      })
      .eq("id", taskId);

    if (error) return { error: sanitizeError(error, { action: "toggleLeadTask" }) };
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "toggleLeadTask" }) };
  }
}

export async function initializeLeadTasks(leadId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  const sopSteps = [
    "Lead Binnenkomst (Nieuw)",
    "Plan-keuze Link Verstuurd (Agent 1)",
    "Plan Geselecteerd (Lead Actie)",
    "Eerste Betaling Voldaan (Mollie)",
    "Auto-Provision Account Activated",
    "Onboarding Mail Verstuurd",
  ];

  try {
    const supabase = createServiceClient();
    
    // Check if tasks already exist
    const { count } = await supabase
      .from("lead_tasks")
      .select("*", { count: "exact", head: true })
      .eq("lead_id", leadId);

    if ((count || 0) > 0) return { error: null };

    const taskRows = sopSteps.map(title => ({
      lead_id: leadId,
      title,
      completed: false
    }));

    const { error } = await supabase.from("lead_tasks").insert(taskRows);

    if (error) return { error: sanitizeError(error, { action: "initializeLeadTasks" }) };
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "initializeLeadTasks" }) };
  }
}

export async function updateLeadPlan(
  leadId: string,
  planId: string
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("leads")
      .update({ target_plan_id: planId, updated_at: new Date().toISOString() })
      .eq("id", leadId);

    if (error) return { error: sanitizeError(error, { action: "updateLeadPlan" }) };

    revalidatePath(`/admin/leads/${leadId}`);
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "updateLeadPlan" }) };
  }
}

export async function autoProvisionAccount(leadId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    
    // 1. Fetch Lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) return { error: "Lead niet gevonden." };
    if (!lead.target_plan_id) return { error: "Geen pakket geselecteerd voor deze lead." };

    // 2. Check if already provisioned
    if (lead.vat100_user_id) return { error: "Deze lead heeft al een gekoppelde account." };

    // 3. Create Auth User (using target data if available in metadata)
    const metadata = lead.metadata || {};
    const targetFullName = metadata.target_full_name || `${lead.first_name || ""} ${lead.last_name || ""}`.trim();
    const targetCompanyName = metadata.target_company_name || lead.company_name;
    const targetPassword = metadata.target_password_plain || Math.random().toString(36).slice(-12);

    const { data: userData, error: authError } = await supabase.auth.admin.createUser({
      email: lead.email,
      password: targetPassword,
      email_confirm: true,
      user_metadata: {
        full_name: targetFullName,
        studio_name: targetCompanyName,
      }
    });

    if (authError || !userData.user) {
      return { error: `Kon gebruiker niet aanmaken: ${authError?.message}` };
    }

    const userId = userData.user.id;

    // 4. Create Profile (if not already existing)
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        full_name: targetFullName,
        studio_name: targetCompanyName,
        email: lead.email
      });

    // 5. Create Subscription for the chosen plan
    const { error: subError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan_id: lead.target_plan_id,
        status: "active", // Provisioned as active by admin/system after payment
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

    if (subError) {
      // Rollback auth user
      await supabase.auth.admin.deleteUser(userId);
      return { error: `Fout bij aanmaken abonnement: ${subError.message}` };
    }

    // 6. Update Lead Status & Link User & Clear temporary data
    const finalMetadata = { ...metadata };
    delete finalMetadata.target_password_plain; // Clear sensitive data

    await supabase
      .from("leads")
      .update({ 
        lifecycle_stage: "Klant", 
        vat100_user_id: userId,
        metadata: finalMetadata,
        updated_at: new Date().toISOString() 
      })
      .eq("id", leadId);

    // 6. Log Activity
    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      activity_type: "system_alert",
      description: `Account automatisch aangemaakt (ID: ${userId}) op plan ${lead.target_plan_id}.`,
    });

    // 7. Mark SOP tasks as complete
    await supabase
      .from("lead_tasks")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("lead_id", leadId);

    revalidatePath("/admin");
    revalidatePath(`/admin/leads/${leadId}`);
    
    // 8. SEND WELCOME EMAIL (Async)
    sendWelcomeEmail({
      email: lead.email,
      fullName: targetFullName,
      tempPassword: targetPassword,
      studioName: targetCompanyName
    }).catch(err => console.error("[Provision] Email error:", err));

    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "autoProvisionAccount" }) };
  }
}

export async function getLeadByToken(token: string): Promise<ActionResult<{ id: string, email: string, full_name: string, company_name: string, plan_id: string | null }>> {
  try {
    const supabase = createServiceClient();
    
    // 1. Find token
    const { data: tokenData, error: tokenError } = await supabase
      .from("lead_tokens")
      .select("*, lead:leads(*)")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) return { error: "Ongeldige of verlopen link." };
    
    // 2. Check expiry
    if (new Date(tokenData.expires_at) < new Date()) {
      return { error: "Deze link is verlopen. Vraag een nieuwe aan." };
    }

    const lead = tokenData.lead;
    
    return { 
      error: null, 
      data: {
        id: lead.id,
        email: lead.email,
        full_name: `${lead.first_name || ""} ${lead.last_name || ""}`.trim(),
        company_name: lead.company_name || "",
        plan_id: lead.target_plan_id
      }
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getLeadByToken" }) };
  }
}

export async function initiateLeadPayment(
  leadId: string,
  planId: string,
  fullName?: string,
  companyName?: string,
  password?: string
): Promise<ActionResult<{ checkoutUrl: string }>> {
  try {
    const supabase = createServiceClient();
    
    // 1. Get Lead & Plan
    const [{ data: lead }, { data: plan }] = await Promise.all([
      supabase.from("leads").select("*").eq("id", leadId).single(),
      supabase.from("plans").select("*").eq("id", planId).single()
    ]);

    if (!lead || !plan) return { error: "Lead of Plan niet gevonden." };

    // 2. Update Lead Info in Metadata (temporary storage for provisioning)
    const [firstName, ...lastNameParts] = (fullName || "").split(" ");
    const lastName = lastNameParts.join(" ");

    const updatedMetadata = {
      ...(lead.metadata || {}),
      target_full_name: fullName,
      target_company_name: companyName,
      target_password_plain: password, // Stored temporarily until activation
    };

    await supabase.from("leads").update({
      first_name: firstName || lead.first_name,
      last_name: lastName || lead.last_name,
      company_name: companyName || lead.company_name,
      target_plan_id: planId,
      metadata: updatedMetadata,
      lifecycle_stage: "Plan Gekozen",
      updated_at: new Date().toISOString()
    }).eq("id", leadId);

    // 3. Create Mollie Customer
    const customerName = companyName || fullName || lead.email;
    const customerResult = await createMollieCustomer(customerName, lead.email);
    if (customerResult.error || !customerResult.data) {
      return { error: "Kon Mollie klant niet aanmaken." };
    }

    // 4. Initiate Payment
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const paymentResult = await createFirstPayment({
      customerId: customerResult.data.id,
      amount: plan.price_cents / 100,
      description: `VAT100 ${plan.name} — Onboarding`,
      redirectUrl: `${baseUrl}/register/callback?lead_id=${leadId}`,
      webhookUrl: `${baseUrl}/api/webhooks/mollie`,
      metadata: {
        type: "lead_payment",
        lead_id: leadId,
        plan_id: planId
      }
    });

    if (paymentResult.error || !paymentResult.data) {
      return { error: "Kon Mollie betaling niet aanmaken." };
    }

    const checkoutUrl = paymentResult.data._links.checkout?.href;
    if (!checkoutUrl) return { error: "Geen checkout URL ontvangen." };

    return { error: null, data: { checkoutUrl } };
  } catch (e) {
    return { error: sanitizeError(e, { action: "initiateLeadPayment" }) };
  }
}

export async function checkLeadActivation(
  leadId: string
): Promise<ActionResult<{ activated: boolean; userId: string | null }>> {
  try {
    const supabase = createServiceClient();
    const { data: lead, error } = await supabase
      .from("leads")
      .select("vat100_user_id")
      .eq("id", leadId)
      .single();

    if (error || !lead) return { error: "Lead niet gevonden." };

    return { 
      error: null, 
      data: { 
        activated: !!lead.vat100_user_id, 
        userId: lead.vat100_user_id 
      } 
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "checkLeadActivation" }) };
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


