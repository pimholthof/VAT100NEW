"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email/send-onboarding";
import { createServiceClient } from "@/lib/supabase/service";
import * as Sentry from "@sentry/nextjs";
import type {
  ActionResult,
  Lead,
  LeadLifecycle,
} from "@/lib/types";
import { sanitizeError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/admin/audit";
import {
  createMollieCustomer,
  createFirstPayment,
} from "@/lib/payments/mollie-subscriptions";


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

    await logAdminAction(auth.user.id, "lead.stage_change", "lead", leadId, { newStage });
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
    await supabase
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

    await logAdminAction(auth.user.id, "lead.provision", "lead", leadId, { userId, plan: lead.target_plan_id });
    revalidatePath("/admin");
    revalidatePath(`/admin/leads/${leadId}`);

    // 8. SEND WELCOME EMAIL (Async)
    sendWelcomeEmail({
      email: lead.email,
      fullName: targetFullName,
      tempPassword: targetPassword,
      studioName: targetCompanyName
    }).catch(err => Sentry.captureException(err, { tags: { area: "lead-provision-email" } }));

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
