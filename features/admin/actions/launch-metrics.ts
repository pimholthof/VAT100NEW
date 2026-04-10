"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";
import { sanitizeError } from "@/lib/errors";

export interface LaunchMetrics {
  // Activatie
  totalRegistrations: number;
  onboardingCompleted: number;
  activationRate: number; // percentage: completed / registered

  // Feature adoptie
  featureAdoption: {
    feature: string;
    usageCount: number;
    uniqueUsers: number;
  }[];

  // Engagement
  dailyActiveUsers: number; // users with events today
  weeklyActiveUsers: number; // users with events this week

  // Onboarding duur
  averageOnboardingMinutes: number; // avg time between registration and first invoice

  // Feedback summary
  feedbackCount: number;
  feedbackByCategory: { category: string; count: number }[];

  // NPS
  npsScore: number | null; // average NPS score, null if no data
  npsResponses: number;
}

export async function getLaunchMetrics(): Promise<ActionResult<LaunchMetrics>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const now = new Date();

    // 1. Activatie: total registrations & onboarding completed
    const [{ count: totalRegistrations }, { count: onboardingCompleted }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .not("onboarding_completed_at", "is", null),
      ]);

    const regCount = totalRegistrations ?? 0;
    const onbCount = onboardingCompleted ?? 0;
    const activationRate = regCount > 0 ? (onbCount / regCount) * 100 : 0;

    // 2. Feature adoptie: group user.* events by event_type
    const { data: featureEvents } = await supabase
      .from("system_events")
      .select("event_type, payload")
      .like("event_type", "user.%");

    const featureMap = new Map<
      string,
      { usageCount: number; users: Set<string> }
    >();
    for (const evt of featureEvents ?? []) {
      const feature = evt.event_type;
      const userId =
        (evt.payload as Record<string, unknown>)?.user_id as string | undefined;
      const existing = featureMap.get(feature) ?? {
        usageCount: 0,
        users: new Set<string>(),
      };
      existing.usageCount++;
      if (userId) existing.users.add(userId);
      featureMap.set(feature, existing);
    }
    const featureAdoption = Array.from(featureMap.entries())
      .map(([feature, data]) => ({
        feature,
        usageCount: data.usageCount,
        uniqueUsers: data.users.size,
      }))
      .sort((a, b) => b.usageCount - a.usageCount);

    // 3. Engagement: DAU / WAU via distinct user_ids in system_events
    const oneDayAgo = new Date(
      now.getTime() - 24 * 60 * 60 * 1000
    ).toISOString();
    const sevenDaysAgo = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const [{ data: dauEvents }, { data: wauEvents }] = await Promise.all([
      supabase
        .from("system_events")
        .select("payload")
        .gte("created_at", oneDayAgo)
        .like("event_type", "user.%"),
      supabase
        .from("system_events")
        .select("payload")
        .gte("created_at", sevenDaysAgo)
        .like("event_type", "user.%"),
    ]);

    const dauUsers = new Set<string>();
    for (const evt of dauEvents ?? []) {
      const uid = (evt.payload as Record<string, unknown>)?.user_id as
        | string
        | undefined;
      if (uid) dauUsers.add(uid);
    }

    const wauUsers = new Set<string>();
    for (const evt of wauEvents ?? []) {
      const uid = (evt.payload as Record<string, unknown>)?.user_id as
        | string
        | undefined;
      if (uid) wauUsers.add(uid);
    }

    // 4. Onboarding duur: avg time between profile created_at and first user.invoice_created
    const { data: invoiceCreatedEvents } = await supabase
      .from("system_events")
      .select("payload, created_at")
      .eq("event_type", "user.invoice_created")
      .order("created_at", { ascending: true });

    // Get earliest invoice event per user
    const firstInvoiceByUser = new Map<string, string>();
    for (const evt of invoiceCreatedEvents ?? []) {
      const uid = (evt.payload as Record<string, unknown>)?.user_id as
        | string
        | undefined;
      if (uid && !firstInvoiceByUser.has(uid)) {
        firstInvoiceByUser.set(uid, evt.created_at);
      }
    }

    let averageOnboardingMinutes = 0;
    if (firstInvoiceByUser.size > 0) {
      // Fetch profiles for these users to get their created_at
      const userIds = Array.from(firstInvoiceByUser.keys());
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, created_at")
        .in("id", userIds);

      let totalMinutes = 0;
      let validCount = 0;
      for (const profile of profilesData ?? []) {
        const firstInvoiceAt = firstInvoiceByUser.get(
          profile.id as string
        );
        if (firstInvoiceAt && profile.created_at) {
          const diff =
            new Date(firstInvoiceAt).getTime() -
            new Date(profile.created_at as string).getTime();
          if (diff >= 0) {
            totalMinutes += diff / (1000 * 60);
            validCount++;
          }
        }
      }
      averageOnboardingMinutes =
        validCount > 0 ? Math.round(totalMinutes / validCount) : 0;
    }

    // 5. Feedback summary
    const { data: feedbackEvents } = await supabase
      .from("system_events")
      .select("payload")
      .eq("event_type", "user.feedback");

    const feedbackCount = feedbackEvents?.length ?? 0;
    const categoryMap = new Map<string, number>();
    for (const evt of feedbackEvents ?? []) {
      const category =
        ((evt.payload as Record<string, unknown>)?.category as string) ??
        "overig";
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + 1);
    }
    const feedbackByCategory = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // 6. NPS
    const { data: npsEvents } = await supabase
      .from("system_events")
      .select("payload")
      .eq("event_type", "user.nps_score");

    const npsResponses = npsEvents?.length ?? 0;
    let npsScore: number | null = null;
    if (npsResponses > 0) {
      const totalScore = (npsEvents ?? []).reduce((sum, evt) => {
        const score = Number(
          (evt.payload as Record<string, unknown>)?.score ?? 0
        );
        return sum + score;
      }, 0);
      npsScore = Math.round((totalScore / npsResponses) * 10) / 10;
    }

    return {
      error: null,
      data: {
        totalRegistrations: regCount,
        onboardingCompleted: onbCount,
        activationRate: Math.round(activationRate * 10) / 10,
        featureAdoption,
        dailyActiveUsers: dauUsers.size,
        weeklyActiveUsers: wauUsers.size,
        averageOnboardingMinutes,
        feedbackCount,
        feedbackByCategory,
        npsScore,
        npsResponses,
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getLaunchMetrics" }) };
  }
}
