"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export interface OnboardingProgress {
  hasProfile: boolean;
  hasFiscalProfile: boolean;
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
    supabase.from("profiles").select("kvk_number, studio_name, onboarding_completed_at, onboarding_dismissed_at, estimated_annual_income, uses_kor").eq("id", user.id).single(),
    supabase.from("clients").select("id").eq("user_id", user.id).limit(1),
    supabase.from("invoices").select("id").eq("user_id", user.id).limit(1),
    supabase.from("receipts").select("id").eq("user_id", user.id).limit(1),
    supabase.from("bank_connections").select("id").eq("user_id", user.id).limit(1),
  ]);

  // Profiel is compleet als studio_name OF kvk_number is ingevuld
  const hasProfile = !!(profileRes.data?.kvk_number || profileRes.data?.studio_name);
  // Fiscaal profiel is compleet als geschat inkomen is ingevuld of KOR is geactiveerd
  const hasFiscalProfile = !!(profileRes.data?.estimated_annual_income != null || profileRes.data?.uses_kor);
  const hasClient = (clientRes.data?.length ?? 0) > 0;
  const hasInvoice = (invoiceRes.data?.length ?? 0) > 0;
  const hasReceipt = (receiptRes.data?.length ?? 0) > 0;
  const hasBankConnection = (bankRes.data?.length ?? 0) > 0;

  const allDone = hasProfile && hasFiscalProfile && hasClient && hasInvoice && hasReceipt && hasBankConnection;

  return {
    error: null,
    data: {
      hasProfile,
      hasFiscalProfile,
      hasClient,
      hasInvoice,
      hasReceipt,
      hasBankConnection,
      onboardingCompleted: allDone,
      onboardingDismissed: !!profileRes.data?.onboarding_dismissed_at,
    },
  };
}

export async function markOnboardingDismissed(): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_dismissed_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}
