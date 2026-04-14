"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  ActionResult,
  InvoiceStatus,
} from "@/lib/types";
import { sanitizeError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/admin/audit";


// ─── Customer Creation ───

export interface CreateCustomerInput {
  email: string;
  password: string;
  full_name: string;
  studio_name?: string;
  plan_id: string;
  send_welcome_email?: boolean;
}

export interface CreatedCustomer {
  userId: string;
  email: string;
  tempPassword: string;
}

export async function createCustomerAccount(
  input: CreateCustomerInput
): Promise<ActionResult<CreatedCustomer>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  const { email, password, full_name, studio_name, plan_id, send_welcome_email } = input;

  if (!email || !password || !full_name || !plan_id) {
    return { error: "Vul alle verplichte velden in." };
  }

  if (password.length < 8) {
    return { error: "Wachtwoord moet minimaal 8 tekens bevatten." };
  }

  try {
    const supabase = createServiceClient();

    // 1. Create Auth User
    const { data: userData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        studio_name: studio_name || null,
      },
    });

    if (authError || !userData.user) {
      return { error: `Kon gebruiker niet aanmaken: ${authError?.message}` };
    }

    const userId = userData.user.id;

    // 2. Update Profile (trigger on_auth_user_created already inserts a row)
    const { error: profileError } = await supabase.from("profiles").update({
      full_name,
      studio_name: studio_name || null,
    }).eq("id", userId);

    if (profileError) {
      await supabase.auth.admin.deleteUser(userId);
      return { error: `Fout bij aanmaken profiel: ${profileError.message}` };
    }

    // 3. Create Subscription
    const { error: subError } = await supabase.from("subscriptions").insert({
      user_id: userId,
      plan_id,
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (subError) {
      await supabase.auth.admin.deleteUser(userId);
      return { error: `Fout bij aanmaken abonnement: ${subError.message}` };
    }

    // 4. Log admin action
    await logAdminAction(auth.user.id, "customer.create", "customer", userId, {
      email,
      plan_id,
      full_name,
    });

    // 5. Send welcome email (async, non-blocking)
    if (send_welcome_email) {
      const { sendWelcomeEmail } = await import("@/lib/email/send-onboarding");
      sendWelcomeEmail({
        email,
        fullName: full_name,
        tempPassword: password,
        studioName: studio_name,
      }).catch((err) => {
        console.error("[Admin] Welcome email failed:", err);
      });
    }

    revalidatePath("/admin/klanten");

    return {
      error: null,
      data: {
        userId,
        email,
        tempPassword: password,
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "createCustomerAccount" }) };
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
    email?: string;
  }
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();

    // Email lives in auth.users, not profiles
    if (data.email) {
      const { error: emailError } = await supabase.auth.admin.updateUserById(userId, {
        email: data.email,
      });
      if (emailError) return { error: `E-mail update mislukt: ${emailError.message}` };
    }

    // Only send profile-valid fields to profiles table
    const profileData: Record<string, string> = {};
    const profileFields = ["full_name", "studio_name", "kvk_number", "btw_number", "iban", "address", "city", "postal_code"] as const;
    for (const field of profileFields) {
      if (data[field] !== undefined) profileData[field] = data[field] as string;
    }

    if (Object.keys(profileData).length > 0) {
      const { error } = await supabase
        .from("profiles")
        .update({ ...profileData, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) return { error: sanitizeError(error, { action: "updateCustomerProfile" }) };
    }

    await logAdminAction(auth.user.id, "customer.profile_update", "customer", userId, data);
    revalidatePath(`/admin/klanten/${userId}`);
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
    await logAdminAction(auth.user.id, "invoice.status_change", "invoice", invoiceId, { newStatus });
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

// ─── Admin Client Management ───

export async function updateClientAsAdmin(
  clientId: string,
  data: {
    name?: string;
    email?: string | null;
    city?: string | null;
    contact_name?: string | null;
    address?: string | null;
    postal_code?: string | null;
    kvk_number?: string | null;
    btw_number?: string | null;
  }
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("clients")
      .update(data)
      .eq("id", clientId);

    if (error) return { error: sanitizeError(error, { action: "updateClientAsAdmin" }) };
    await logAdminAction(auth.user.id, "customer.profile_update", "client", clientId, data);
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "updateClientAsAdmin", clientId }) };
  }
}

export async function deleteClientAsAdmin(clientId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId);

    if (error) return { error: sanitizeError(error, { action: "deleteClientAsAdmin" }) };
    await logAdminAction(auth.user.id, "customer.bulk_action", "client", clientId, { action: "delete" });
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "deleteClientAsAdmin", clientId }) };
  }
}

// ─── Admin Invoice Management ───

export async function updateInvoiceAsAdmin(
  invoiceId: string,
  data: {
    status?: InvoiceStatus;
    issue_date?: string;
    due_date?: string;
  }
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("invoices")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", invoiceId);

    if (error) return { error: sanitizeError(error, { action: "updateInvoiceAsAdmin" }) };
    await logAdminAction(auth.user.id, "invoice.status_change", "invoice", invoiceId, data);
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "updateInvoiceAsAdmin", invoiceId }) };
  }
}

export async function deleteInvoiceAsAdmin(invoiceId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    // Delete invoice lines first
    await supabase.from("invoice_lines").delete().eq("invoice_id", invoiceId);
    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoiceId);

    if (error) return { error: sanitizeError(error, { action: "deleteInvoiceAsAdmin" }) };
    await logAdminAction(auth.user.id, "invoice.status_change", "invoice", invoiceId, { action: "delete" });
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "deleteInvoiceAsAdmin", invoiceId }) };
  }
}

// ─── Admin Receipt Management ───

export async function updateReceiptAsAdmin(
  receiptId: string,
  data: {
    vendor_name?: string;
    category?: string | null;
    amount_inc_vat?: number;
    receipt_date?: string;
  }
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("receipts")
      .update(data)
      .eq("id", receiptId);

    if (error) return { error: sanitizeError(error, { action: "updateReceiptAsAdmin" }) };
    await logAdminAction(auth.user.id, "customer.profile_update", "receipt", receiptId, data);
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "updateReceiptAsAdmin", receiptId }) };
  }
}

export async function deleteReceiptAsAdmin(receiptId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("receipts")
      .delete()
      .eq("id", receiptId);

    if (error) return { error: sanitizeError(error, { action: "deleteReceiptAsAdmin" }) };
    await logAdminAction(auth.user.id, "customer.bulk_action", "receipt", receiptId, { action: "delete" });
    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "deleteReceiptAsAdmin", receiptId }) };
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

// ─── Customer Benchmarks ───

export interface CustomerBenchmarks {
  avgInvoiceAmount: number;
  avgPaymentDays: number;
  clientCount: number;
  expenseRatio: number;
  hasBankConnection: boolean;
  hasHoursLogged: boolean;
  platform: {
    avgInvoiceAmount: number;
    avgPaymentDays: number;
    avgClientCount: number;
    avgExpenseRatio: number;
  };
}

export async function getCustomerBenchmarks(userId: string): Promise<ActionResult<CustomerBenchmarks>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();

    // Fetch user-specific data and platform averages in parallel
    const [
      userInvoicesResult,
      userClientsResult,
      userReceiptsResult,
      userBankResult,
      userHoursResult,
      platformInvoicesResult,
      platformClientsResult,
      platformReceiptsResult,
    ] = await Promise.all([
      // User data
      supabase
        .from("invoices")
        .select("total_inc_vat, status, issue_date, paid_at")
        .eq("user_id", userId),
      supabase
        .from("clients")
        .select("id", { count: "exact" })
        .eq("user_id", userId),
      supabase
        .from("receipts")
        .select("amount_inc_vat")
        .eq("user_id", userId),
      supabase
        .from("bank_connections")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1),
      supabase
        .from("hours_logs")
        .select("id")
        .eq("user_id", userId)
        .limit(1),
      // Platform averages
      supabase
        .from("invoices")
        .select("total_inc_vat, status, issue_date, paid_at, user_id"),
      supabase
        .from("clients")
        .select("user_id"),
      supabase
        .from("receipts")
        .select("amount_inc_vat, user_id"),
    ]);

    // User metrics
    const userInvoices = userInvoicesResult.data ?? [];
    const paidUserInvoices = userInvoices.filter((i) => i.status === "paid");
    const userRevenue = paidUserInvoices.reduce((sum, i) => sum + (Number(i.total_inc_vat) || 0), 0);
    const avgInvoiceAmount = paidUserInvoices.length > 0
      ? userRevenue / paidUserInvoices.length
      : 0;

    // Average payment days for user
    const paymentDays = paidUserInvoices
      .filter((i) => i.issue_date && i.paid_at)
      .map((i) => {
        const issued = new Date(i.issue_date).getTime();
        const paid = new Date(i.paid_at).getTime();
        return Math.max(0, Math.floor((paid - issued) / (1000 * 60 * 60 * 24)));
      });
    const avgPaymentDays = paymentDays.length > 0
      ? paymentDays.reduce((s, d) => s + d, 0) / paymentDays.length
      : 0;

    const clientCount = userClientsResult.count ?? 0;

    const userExpenses = (userReceiptsResult.data ?? []).reduce((sum, r) => sum + (Number(r.amount_inc_vat) || 0), 0);
    const expenseRatio = userRevenue > 0 ? userExpenses / userRevenue : 0;

    const hasBankConnection = (userBankResult.data ?? []).length > 0;
    const hasHoursLogged = (userHoursResult.data ?? []).length > 0;

    // Platform averages
    const allInvoices = platformInvoicesResult.data ?? [];
    const allPaid = allInvoices.filter((i) => i.status === "paid");
    const platformRevenue = allPaid.reduce((sum, i) => sum + (Number(i.total_inc_vat) || 0), 0);
    const platformAvgInvoice = allPaid.length > 0 ? platformRevenue / allPaid.length : 0;

    const allPaymentDays = allPaid
      .filter((i) => i.issue_date && i.paid_at)
      .map((i) => {
        const issued = new Date(i.issue_date).getTime();
        const paid = new Date(i.paid_at).getTime();
        return Math.max(0, Math.floor((paid - issued) / (1000 * 60 * 60 * 24)));
      });
    const platformAvgPaymentDays = allPaymentDays.length > 0
      ? allPaymentDays.reduce((s, d) => s + d, 0) / allPaymentDays.length
      : 0;

    // Average clients per user
    const allClients = platformClientsResult.data ?? [];
    const clientsByUser = new Map<string, number>();
    for (const c of allClients) {
      clientsByUser.set(c.user_id, (clientsByUser.get(c.user_id) ?? 0) + 1);
    }
    const platformAvgClients = clientsByUser.size > 0
      ? [...clientsByUser.values()].reduce((s, n) => s + n, 0) / clientsByUser.size
      : 0;

    // Average expense ratio per user
    const allReceipts = platformReceiptsResult.data ?? [];
    const expensesByUser = new Map<string, number>();
    for (const r of allReceipts) {
      expensesByUser.set(r.user_id, (expensesByUser.get(r.user_id) ?? 0) + (Number(r.amount_inc_vat) || 0));
    }
    const revenueByUser = new Map<string, number>();
    for (const i of allPaid) {
      revenueByUser.set(i.user_id, (revenueByUser.get(i.user_id) ?? 0) + (Number(i.total_inc_vat) || 0));
    }
    let totalRatios = 0;
    let ratioCount = 0;
    for (const [uid, rev] of revenueByUser) {
      if (rev > 0) {
        const exp = expensesByUser.get(uid) ?? 0;
        totalRatios += exp / rev;
        ratioCount++;
      }
    }
    const platformAvgExpenseRatio = ratioCount > 0 ? totalRatios / ratioCount : 0;

    return {
      error: null,
      data: {
        avgInvoiceAmount: Math.round(avgInvoiceAmount * 100) / 100,
        avgPaymentDays: Math.round(avgPaymentDays * 10) / 10,
        clientCount,
        expenseRatio: Math.round(expenseRatio * 1000) / 1000,
        hasBankConnection,
        hasHoursLogged,
        platform: {
          avgInvoiceAmount: Math.round(platformAvgInvoice * 100) / 100,
          avgPaymentDays: Math.round(platformAvgPaymentDays * 10) / 10,
          avgClientCount: Math.round(platformAvgClients * 10) / 10,
          avgExpenseRatio: Math.round(platformAvgExpenseRatio * 1000) / 1000,
        },
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getCustomerBenchmarks", userId }) };
  }
}
