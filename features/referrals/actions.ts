"use server";

import { requireAuth } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";

export interface ReferralStats {
  code: string;
  shareUrl: string;
  totalReferred: number;
  qualifiedCount: number;
  monthsEarned: number;
}

/**
 * Haal de persoonlijke referral-code + stats op.
 *
 * Businessdoel: K-factor > 0.3 → elke klant brengt 0.3 nieuwe klant aan.
 * Bij €50 ARPU en €120 CAC verdient elke referral zichzelf 2.4x terug.
 */
export async function getReferralStats(): Promise<ActionResult<ReferralStats>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("referral_code")
    .eq("id", auth.user.id)
    .single();

  if (!profile?.referral_code) {
    return { error: "Referral-code nog niet beschikbaar." };
  }

  const { data: referrals } = await auth.supabase
    .from("referrals")
    .select("status, referrer_reward_months")
    .eq("referrer_user_id", auth.user.id);

  const list = referrals ?? [];
  const qualified = list.filter(
    (r) => r.status === "qualified" || r.status === "rewarded",
  );
  const monthsEarned = qualified.reduce(
    (sum, r) => sum + (r.referrer_reward_months ?? 1),
    0,
  );

  return {
    error: null,
    data: {
      code: profile.referral_code,
      shareUrl: `https://vat100.nl/?r=${profile.referral_code}`,
      totalReferred: list.length,
      qualifiedCount: qualified.length,
      monthsEarned,
    },
  };
}

/**
 * Registreer een nieuwe referral bij subscription-activatie.
 * Wordt aangeroepen vanuit de Mollie webhook zodra een pending → active gaat.
 */
export async function registerReferralFromCode(
  newUserId: string,
  referralCode: string,
): Promise<void> {
  const supabase = createServiceClient();

  const { data: referrer } = await supabase
    .from("profiles")
    .select("id")
    .eq("referral_code", referralCode)
    .single();

  if (!referrer || referrer.id === newUserId) return;

  await supabase
    .from("referrals")
    .insert({
      referrer_user_id: referrer.id,
      referred_user_id: newUserId,
      status: "pending",
    })
    .select();
}

/**
 * Markeer een referral als qualified zodra de referred user zijn eerste
 * betaling heeft volbracht. Geeft de verwijzer recht op 1 maand krediet.
 */
export async function qualifyReferral(referredUserId: string): Promise<void> {
  const supabase = createServiceClient();

  await supabase
    .from("referrals")
    .update({
      status: "qualified",
      qualified_at: new Date().toISOString(),
    })
    .eq("referred_user_id", referredUserId)
    .eq("status", "pending");
}
