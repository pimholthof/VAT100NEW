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
  ChatMessage,
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

// ─── Customer Management (Klantbeheer) ───

export interface CustomerOverviewItem {
  id: string;
  full_name: string | null;
  studio_name: string | null;
  email: string;
  status: string;
  plan_name: string | null;
  subscription_status: string | null;
  invoice_count: number;
  total_revenue: number;
  last_activity: string | null;
  created_at: string;
}

export async function getCustomerOverview(filters?: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{ customers: CustomerOverviewItem[]; total: number }>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 25;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Get profiles with subscriptions
    let query = supabase
      .from("profiles")
      .select("*, subscriptions(status, plan:plans(name))", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      query = query.or(`full_name.ilike.${term},studio_name.ilike.${term}`);
    }

    const { data: profiles, count, error } = await query;
    if (error) return { error: sanitizeError(error, { action: "getCustomerOverview" }) };

    const userIds = (profiles ?? []).map((p) => p.id);

    // Get invoice stats
    const { data: invoiceStats } = await supabase
      .from("invoices")
      .select("user_id, total_inc_vat, status, created_at")
      .in("user_id", userIds.length > 0 ? userIds : ["__none__"]);

    // Get auth emails
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map<string, string>();
    for (const u of authData?.users ?? []) {
      emailMap.set(u.id, u.email ?? "");
    }

    // Aggregate
    const statsMap = new Map<string, { count: number; revenue: number; lastActivity: string | null }>();
    for (const inv of invoiceStats ?? []) {
      const existing = statsMap.get(inv.user_id) ?? { count: 0, revenue: 0, lastActivity: null };
      existing.count++;
      if (inv.status === "paid") existing.revenue += Number(inv.total_inc_vat) || 0;
      if (!existing.lastActivity || inv.created_at > existing.lastActivity) existing.lastActivity = inv.created_at;
      statsMap.set(inv.user_id, existing);
    }

    const customers: CustomerOverviewItem[] = (profiles ?? []).map((p) => {
      const stats = statsMap.get(p.id);
      const sub = Array.isArray(p.subscriptions) ? p.subscriptions[0] : null;
      return {
        id: p.id,
        full_name: p.full_name,
        studio_name: p.studio_name,
        email: emailMap.get(p.id) ?? "",
        status: p.status ?? "active",
        plan_name: (sub?.plan as { name: string } | null)?.name ?? null,
        subscription_status: sub?.status ?? null,
        invoice_count: stats?.count ?? 0,
        total_revenue: Math.round((stats?.revenue ?? 0) * 100) / 100,
        last_activity: stats?.lastActivity ?? null,
        created_at: p.created_at,
      };
    });

    return { error: null, data: { customers, total: count ?? 0 } };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getCustomerOverview" }) };
  }
}

export interface CustomerDetail {
  profile: Record<string, unknown> & { email: string; role: string; status: string };
  subscription: { plan_name: string; status: string; current_period_end: string } | null;
  stats: {
    totalInvoices: number;
    totalRevenue: number;
    openInvoices: number;
    openAmount: number;
    totalClients: number;
    totalReceipts: number;
  };
  invoices: Array<{
    id: string;
    invoice_number: string;
    status: string;
    issue_date: string;
    total_inc_vat: number;
    client_name: string;
  }>;
  clients: Array<{
    id: string;
    name: string;
    email: string | null;
    city: string | null;
  }>;
  receipts: Array<{
    id: string;
    vendor_name: string;
    amount_inc_vat: number;
    receipt_date: string;
    category: string | null;
  }>;
}

export async function getCustomerDetail(userId: string): Promise<ActionResult<CustomerDetail>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();

    const [profileResult, invoicesResult, clientsResult, receiptsResult, subResult] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase
          .from("invoices")
          .select("id, invoice_number, status, issue_date, total_inc_vat, client:clients(name)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("clients")
          .select("id, name, email, city")
          .eq("user_id", userId)
          .order("name", { ascending: true }),
        supabase
          .from("receipts")
          .select("id, vendor_name, amount_inc_vat, receipt_date, category")
          .eq("user_id", userId)
          .order("receipt_date", { ascending: false })
          .limit(50),
        supabase
          .from("subscriptions")
          .select("*, plan:plans(name)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

    if (profileResult.error || !profileResult.data) {
      return { error: "Klant niet gevonden." };
    }

    const { data: authData } = await supabase.auth.admin.getUserById(userId);
    const email = authData?.user?.email ?? "";

    const invoices = invoicesResult.data ?? [];
    const totalRevenue = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + (Number(i.total_inc_vat) || 0), 0);
    const openInvoices = invoices.filter((i) => i.status === "sent" || i.status === "overdue");
    const openAmount = openInvoices.reduce((sum, i) => sum + (Number(i.total_inc_vat) || 0), 0);

    const sub = (subResult.data ?? [])[0] ?? null;
    const profile = profileResult.data;

    return {
      error: null,
      data: {
        profile: {
          ...profile,
          role: profile.role ?? "user",
          status: profile.status ?? "active",
          email,
        },
        subscription: sub ? {
          plan_name: (sub.plan as { name: string } | null)?.name ?? "Onbekend",
          status: sub.status,
          current_period_end: sub.current_period_end,
        } : null,
        stats: {
          totalInvoices: invoices.length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          openInvoices: openInvoices.length,
          openAmount: Math.round(openAmount * 100) / 100,
          totalClients: (clientsResult.data ?? []).length,
          totalReceipts: (receiptsResult.data ?? []).length,
        },
        invoices: invoices.map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          status: inv.status,
          issue_date: inv.issue_date,
          total_inc_vat: Number(inv.total_inc_vat) || 0,
          client_name: (inv.client as unknown as { name: string })?.name ?? "\u2014",
        })),
        clients: (clientsResult.data ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          city: c.city,
        })),
        receipts: (receiptsResult.data ?? []).map((r) => ({
          id: r.id,
          vendor_name: r.vendor_name,
          amount_inc_vat: Number(r.amount_inc_vat) || 0,
          receipt_date: r.receipt_date,
          category: r.category,
        })),
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getCustomerDetail", userId }) };
  }
}

export async function updateCustomerProfile(
  userId: string,
  data: {
    full_name?: string;
    studio_name?: string;
    kvk_number?: string;
    btw_number?: string;
    iban?: string;
    address?: string;
    city?: string;
    postal_code?: string;
  }
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("profiles")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) return { error: sanitizeError(error, { action: "updateCustomerProfile" }) };

    revalidatePath(`/admin/customers/${userId}`);
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "updateCustomerProfile", userId }) };
  }
}

export async function updateInvoiceStatusAsAdmin(
  invoiceId: string,
  newStatus: InvoiceStatus
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("invoices")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", invoiceId);

    if (error) return { error: sanitizeError(error, { action: "updateInvoiceStatusAsAdmin" }) };
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "updateInvoiceStatusAsAdmin" }) };
  }
}

export async function exportCustomerInvoicesCSV(userId: string): Promise<ActionResult<string>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("invoice_number, status, issue_date, due_date, subtotal_ex_vat, vat_amount, total_inc_vat, vat_rate, client:clients(name)")
      .eq("user_id", userId)
      .order("issue_date", { ascending: false });

    if (error) return { error: sanitizeError(error, { action: "exportCustomerInvoicesCSV" }) };

    const { generateCSV } = await import("@/lib/export/csv");

    const headers = ["Factuurnummer", "Klant", "Status", "Factuurdatum", "Vervaldatum", "Subtotaal", "BTW", "Totaal", "BTW-tarief"];
    const rows = (invoices ?? []).map((inv) => [
      inv.invoice_number || "",
      (inv.client as unknown as { name: string })?.name || "",
      inv.status || "",
      inv.issue_date || "",
      inv.due_date || "",
      String(inv.subtotal_ex_vat ?? 0),
      String(inv.vat_amount ?? 0),
      String(inv.total_inc_vat ?? 0),
      String(inv.vat_rate ?? 21),
    ]);

    return { error: null, data: generateCSV(headers, rows) };
  } catch (e) {
    return { error: sanitizeError(e, { action: "exportCustomerInvoicesCSV" }) };
  }
}

export async function exportCustomerReceiptsCSV(userId: string): Promise<ActionResult<string>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { data: receipts, error } = await supabase
      .from("receipts")
      .select("vendor_name, category, receipt_date, amount_ex_vat, vat_amount, amount_inc_vat, vat_rate")
      .eq("user_id", userId)
      .order("receipt_date", { ascending: false });

    if (error) return { error: sanitizeError(error, { action: "exportCustomerReceiptsCSV" }) };

    const { generateCSV } = await import("@/lib/export/csv");

    const headers = ["Leverancier", "Categorie", "Datum", "Bedrag excl. BTW", "BTW", "Bedrag incl. BTW", "BTW-tarief"];
    const rows = (receipts ?? []).map((r) => [
      r.vendor_name || "",
      r.category || "",
      r.receipt_date || "",
      String(r.amount_ex_vat ?? 0),
      String(r.vat_amount ?? 0),
      String(r.amount_inc_vat ?? 0),
      String(r.vat_rate ?? 21),
    ]);

    return { error: null, data: generateCSV(headers, rows) };
  } catch (e) {
    return { error: sanitizeError(e, { action: "exportCustomerReceiptsCSV" }) };
  }
}

export async function exportAllCustomersCSV(): Promise<ActionResult<string>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*, subscriptions(status, plan:plans(name))")
      .order("created_at", { ascending: false });

    if (error) return { error: sanitizeError(error, { action: "exportAllCustomersCSV" }) };

    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map<string, string>();
    for (const u of authData?.users ?? []) {
      emailMap.set(u.id, u.email ?? "");
    }

    const { generateCSV } = await import("@/lib/export/csv");

    const headers = ["Naam", "Studio", "E-mail", "Status", "Plan", "KVK", "BTW-nummer", "IBAN", "Stad", "Aangemeld"];
    const rows = (profiles ?? []).map((p) => {
      const sub = Array.isArray(p.subscriptions) ? p.subscriptions[0] : null;
      return [
        p.full_name || "",
        p.studio_name || "",
        emailMap.get(p.id) ?? "",
        p.status ?? "active",
        (sub?.plan as { name: string } | null)?.name ?? "",
        p.kvk_number || "",
        p.btw_number || "",
        p.iban || "",
        p.city || "",
        p.created_at ? new Date(p.created_at).toLocaleDateString("nl-NL") : "",
      ];
    });

    return { error: null, data: generateCSV(headers, rows) };
  } catch (e) {
    return { error: sanitizeError(e, { action: "exportAllCustomersCSV" }) };
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


// ─── Chat / Feedback ───

export interface ChatConversationWithUser {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string;
  last_message: string | null;
  last_sender: "user" | "admin" | null;
  message_count: number;
  updated_at: string;
  created_at: string;
}

export async function getChatConversations(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{ entries: ChatConversationWithUser[]; total: number }>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("chat_conversations")
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(from, to);

    const { data: conversations, count, error } = await query;
    if (error) return { error: error.message };
    if (!conversations || conversations.length === 0) {
      return { error: null, data: { entries: [], total: 0 } };
    }

    const userIds = conversations.map((c) => c.user_id);

    // Get profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const profileMap = new Map<string, string | null>();
    for (const p of profiles ?? []) {
      profileMap.set(p.id, p.full_name);
    }

    // Get auth emails
    const { data: authData } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });

    const emailMap = new Map<string, string>();
    for (const u of authData?.users ?? []) {
      emailMap.set(u.id, u.email ?? "");
    }

    // Get last message per conversation
    const conversationIds = conversations.map((c) => c.id);
    const { data: allMessages } = await supabase
      .from("chat_messages")
      .select("conversation_id, message, sender, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    const lastMessageMap = new Map<string, { message: string; sender: "user" | "admin" }>();
    const messageCountMap = new Map<string, number>();
    for (const msg of allMessages ?? []) {
      if (!lastMessageMap.has(msg.conversation_id)) {
        lastMessageMap.set(msg.conversation_id, { message: msg.message, sender: msg.sender as "user" | "admin" });
      }
      messageCountMap.set(msg.conversation_id, (messageCountMap.get(msg.conversation_id) ?? 0) + 1);
    }

    // Filter by search (on name/email)
    let entries: ChatConversationWithUser[] = conversations.map((c) => {
      const last = lastMessageMap.get(c.id);
      return {
        id: c.id,
        user_id: c.user_id,
        user_name: profileMap.get(c.user_id) ?? null,
        user_email: emailMap.get(c.user_id) ?? "",
        last_message: last?.message ?? null,
        last_sender: last?.sender ?? null,
        message_count: messageCountMap.get(c.id) ?? 0,
        updated_at: c.updated_at,
        created_at: c.created_at,
      };
    });

    if (filters?.search?.trim()) {
      const term = filters.search.trim().toLowerCase();
      entries = entries.filter(
        (e) =>
          (e.user_name?.toLowerCase().includes(term)) ||
          e.user_email.toLowerCase().includes(term)
      );
    }

    return { error: null, data: { entries, total: count ?? entries.length } };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getChatConversations" }) };
  }
}

export async function getChatConversationMessages(
  conversationId: string
): Promise<ActionResult<ChatMessage[]>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) return { error: error.message };
    return { error: null, data: data ?? [] };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getChatConversationMessages" }) };
  }
}

export async function sendAdminChatMessage(
  conversationId: string,
  message: string
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  if (!message?.trim()) return { error: "Bericht is verplicht." };

  try {
    const supabase = createServiceClient();

    const { error: msgError } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversationId,
        sender: "admin",
        message: message.trim(),
      });

    if (msgError) return { error: msgError.message };

    // Update conversation timestamp
    await supabase
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    revalidatePath("/admin/feedback");
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "sendAdminChatMessage" }) };
  }
}

export async function getChatKpis(): Promise<ActionResult<PageKpis>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: total },
      { count: thisWeek },
    ] = await Promise.all([
      supabase.from("chat_conversations").select("*", { count: "exact", head: true }),
      supabase.from("chat_conversations").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    ]);

    // Count "unanswered" conversations (last message is from user)
    const { data: allConversations } = await supabase
      .from("chat_conversations")
      .select("id");

    let unanswered = 0;
    if (allConversations && allConversations.length > 0) {
      const ids = allConversations.map((c) => c.id);
      const { data: lastMessages } = await supabase
        .from("chat_messages")
        .select("conversation_id, sender, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false });

      const seen = new Set<string>();
      for (const msg of lastMessages ?? []) {
        if (!seen.has(msg.conversation_id)) {
          seen.add(msg.conversation_id);
          if (msg.sender === "user") unanswered++;
        }
      }
    }

    return {
      error: null,
      data: {
        items: [
          { label: "Totaal gesprekken", value: total ?? 0 },
          { label: "Onbeantwoord", value: unanswered },
          { label: "Deze week", value: thisWeek ?? 0 },
        ],
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getChatKpis" }) };
  }
}
