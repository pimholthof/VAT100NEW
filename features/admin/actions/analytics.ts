"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";
import { sanitizeError } from "@/lib/errors";

export interface SubscriptionAnalytics {
  mrr: number;
  mrrGrowth: number; // percentage vs vorige maand
  totalActiveSubscriptions: number;
  churnRate: number; // percentage deze maand
  arpu: number; // average revenue per user
  ltv: number; // lifetime value estimate
  planDistribution: { planId: string; planName: string; count: number; revenue: number }[];
  conversionFunnel: {
    totalLeads: number;
    linkSent: number;
    planChosen: number;
    customers: number;
    conversionRate: number;
  };
  monthlyMrr: { month: string; mrr: number; subscriptions: number }[];
  cohortRetention: { cohort: string; total: number; active: number; retentionRate: number }[];
}

export async function getSubscriptionAnalytics(): Promise<ActionResult<SubscriptionAnalytics>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const now = new Date();

    // 1. Active subscriptions with plan info
    const { data: activeSubs } = await supabase
      .from("subscriptions")
      .select("*, plan:plans(id, name, price_cents)")
      .eq("status", "active");

    const subs = activeSubs ?? [];
    const totalActive = subs.length;
    const mrr = subs.reduce((sum, s) => {
      const price = (s.plan as { price_cents: number } | null)?.price_cents ?? 0;
      return sum + price / 100;
    }, 0);
    const arpu = totalActive > 0 ? mrr / totalActive : 0;

    // 2. Plan distribution
    const planMap = new Map<string, { planName: string; count: number; revenue: number }>();
    for (const s of subs) {
      const plan = s.plan as { id: string; name: string; price_cents: number } | null;
      if (!plan) continue;
      const existing = planMap.get(plan.id) ?? { planName: plan.name, count: 0, revenue: 0 };
      existing.count++;
      existing.revenue += plan.price_cents / 100;
      planMap.set(plan.id, existing);
    }
    const planDistribution = Array.from(planMap.entries()).map(([planId, data]) => ({
      planId,
      ...data,
    }));

    // 3. Churn: cancelled/expired this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count: churnedThisMonth } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .in("status", ["cancelled", "expired"])
      .gte("updated_at", monthStart);

    // Previous month active count for churn rate
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
    const { count: prevMonthActive } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .lte("created_at", prevMonthEnd);

    const churnRate = (prevMonthActive ?? 0) > 0
      ? ((churnedThisMonth ?? 0) / (prevMonthActive ?? 1)) * 100
      : 0;

    // 4. MRR Growth (compare to previous month)
    const { data: prevMonthSubs } = await supabase
      .from("subscriptions")
      .select("plan:plans(price_cents)")
      .eq("status", "active")
      .lte("created_at", prevMonthEnd);

    const prevMrr = (prevMonthSubs ?? []).reduce((sum, s) => {
      const plan = s.plan as unknown as { price_cents: number } | null;
      return sum + (plan?.price_cents ?? 0) / 100;
    }, 0);
    const mrrGrowth = prevMrr > 0 ? ((mrr - prevMrr) / prevMrr) * 100 : 0;

    // 5. LTV estimate (MRR / churn rate * months, simplified)
    const monthlyChurnRate = churnRate / 100;
    const ltv = monthlyChurnRate > 0 ? arpu / monthlyChurnRate : arpu * 24; // Cap at 24 months if no churn

    // 6. Conversion Funnel
    const { data: allLeads } = await supabase
      .from("leads")
      .select("lifecycle_stage");

    const leads = allLeads ?? [];
    const conversionFunnel = {
      totalLeads: leads.length,
      linkSent: leads.filter((l) => l.lifecycle_stage === "Link Verstuurd").length,
      planChosen: leads.filter((l) => l.lifecycle_stage === "Plan Gekozen").length,
      customers: leads.filter((l) => l.lifecycle_stage === "Klant").length,
      conversionRate: leads.length > 0
        ? (leads.filter((l) => l.lifecycle_stage === "Klant").length / leads.length) * 100
        : 0,
    };

    // 7. Monthly MRR trend (last 6 months)
    const monthlyMrr: SubscriptionAnalytics["monthlyMrr"] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const label = date.toLocaleDateString("nl-NL", { month: "short", year: "numeric" });

      const { data: monthSubs } = await supabase
        .from("subscriptions")
        .select("plan:plans(price_cents)")
        .eq("status", "active")
        .lte("created_at", endOfMonth.toISOString());

      const monthMrr = (monthSubs ?? []).reduce((sum, s) => {
        const plan = s.plan as unknown as { price_cents: number } | null;
        return sum + (plan?.price_cents ?? 0) / 100;
      }, 0);

      monthlyMrr.push({ month: label, mrr: Math.round(monthMrr * 100) / 100, subscriptions: monthSubs?.length ?? 0 });
    }

    // 8. Cohort retention (by signup month, last 6 months)
    const cohortRetention: SubscriptionAnalytics["cohortRetention"] = [];
    for (let i = 5; i >= 0; i--) {
      const cohortStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const cohortEnd = new Date(cohortStart.getFullYear(), cohortStart.getMonth() + 1, 0);
      const label = cohortStart.toLocaleDateString("nl-NL", { month: "short", year: "numeric" });

      const { data: cohortSubs } = await supabase
        .from("subscriptions")
        .select("status")
        .gte("created_at", cohortStart.toISOString())
        .lte("created_at", cohortEnd.toISOString());

      const total = cohortSubs?.length ?? 0;
      const active = (cohortSubs ?? []).filter((s) => s.status === "active").length;

      cohortRetention.push({
        cohort: label,
        total,
        active,
        retentionRate: total > 0 ? Math.round((active / total) * 100) : 0,
      });
    }

    return {
      error: null,
      data: {
        mrr: Math.round(mrr * 100) / 100,
        mrrGrowth: Math.round(mrrGrowth * 10) / 10,
        totalActiveSubscriptions: totalActive,
        churnRate: Math.round(churnRate * 10) / 10,
        arpu: Math.round(arpu * 100) / 100,
        ltv: Math.round(ltv * 100) / 100,
        planDistribution,
        conversionFunnel,
        monthlyMrr,
        cohortRetention,
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getSubscriptionAnalytics" }) };
  }
}
