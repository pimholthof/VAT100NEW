"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export interface OnboardingProgress {
  hasProfile: boolean;
  hasClient: boolean;
  hasInvoice: boolean;
  hasReceipt: boolean;
  hasBankConnection: boolean;
  onboardingCompleted: boolean;
  onboardingDismissed: boolean;
}

export async function getOnboardingProgress(): Promise<ActionResult<OnboardingProgress>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const [profileRes, clientRes, invoiceRes, receiptRes, bankRes] = await Promise.all([
    supabase.from("profiles").select("kvk_number, onboarding_completed_at").eq("id", user.id).single(),
    supabase.from("clients").select("id").eq("user_id", user.id).limit(1),
    supabase.from("invoices").select("id").eq("user_id", user.id).limit(1),
    supabase.from("receipts").select("id").eq("user_id", user.id).limit(1),
    supabase.from("bank_connections").select("id").eq("user_id", user.id).limit(1),
  ]);

  const hasProfile = !!profileRes.data?.kvk_number;
  const hasClient = (clientRes.data?.length ?? 0) > 0;
  const hasInvoice = (invoiceRes.data?.length ?? 0) > 0;
  const hasReceipt = (receiptRes.data?.length ?? 0) > 0;
  const hasBankConnection = (bankRes.data?.length ?? 0) > 0;

  const allDone = hasProfile && hasClient && hasInvoice && hasReceipt && hasBankConnection;

  return {
    error: null,
    data: {
      hasProfile,
      hasClient,
      hasInvoice,
      hasReceipt,
      hasBankConnection,
      onboardingCompleted: allDone,
      onboardingDismissed: false,
    },
  };
}

export async function markOnboardingDismissed(): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };

  // For now, dismissal is handled client-side.
  // In a future iteration, this can be persisted to the profile.
  return { error: null };
}
