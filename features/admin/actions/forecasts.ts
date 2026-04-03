"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";
import { sanitizeError } from "@/lib/errors";

// ─── Types ───

export interface MrrProjection {
  month: string;
  mrr: number;
  isProjected: boolean;
}

export interface CashflowMonth {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface ScenarioProjection {
  label: string;
  type: "conservative" | "realistic" | "optimistic";
  mrrIn6Months: number;
  customersIn6Months: number;
}

export interface PipelineForecast {
  stage: string;
  leads: number;
  conversionPct: number;
  expectedCustomers: number;
  expectedMrr: number;
}

export interface ForecastData {
  // MRR Projection
  mrrTrend: MrrProjection[];
  projectedArrIn3Months: number;

  // Revenue
  projectedQuarterRevenue: number;
  projectedAnnualRevenue: number;
  quarterProgress: number;

  // Customer Growth
  projectedNewCustomersNext3Months: number;
  projectedTotalCustomersEoy: number;
  currentTotalCustomers: number;
  monthlyGrowthRate: number;

  // Churn
  projectedChurnRate: number;
  projectedChurnedCustomersNext3Months: number;
  projectedChurnMrr: number;

  // Pipeline
  pipelineForecast: PipelineForecast[];
  weightedPipelineValue: number;
  expectedNewMrr: number;

  // Cashflow
  cashflowForecast: CashflowMonth[];

  // Scenarios
  scenarios: ScenarioProjection[];
}

// ─── Helpers ───

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("nl-NL", { month: "short", year: "numeric" });
}

const STAGE_CONVERSION_WEIGHTS: Record<string, number> = {
  "Nieuw": 0.05,
  "Link Verstuurd": 0.20,
  "Plan Gekozen": 0.60,
  "Closing": 0.80,
};

// ─── Main Forecast Action ───

export async function getForecasts(): Promise<ActionResult<ForecastData>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // ────────────────────────────────────────────────
    // 1. MRR PROJECTION
    // ────────────────────────────────────────────────

    // Get last 6 months of MRR data
    const mrrHistory: { month: string; mrr: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const { data: monthSubs } = await supabase
        .from("subscriptions")
        .select("plan:plans(price_cents)")
        .eq("status", "active")
        .lte("created_at", endOfMonth.toISOString());

      const mrr = (monthSubs ?? []).reduce((sum, s) => {
        const plan = s.plan as unknown as { price_cents: number } | null;
        return sum + (plan?.price_cents ?? 0) / 100;
      }, 0);

      mrrHistory.push({ month: monthLabel(date), mrr: Math.round(mrr * 100) / 100 });
    }

    // Linear regression for MRR projection
    const mrrValues = mrrHistory.map((m) => m.mrr);
    const { slope, intercept } = linearRegression(mrrValues);

    const mrrTrend: MrrProjection[] = [
      ...mrrHistory.map((m) => ({ ...m, isProjected: false })),
    ];

    // Project 3 months ahead
    for (let i = 1; i <= 3; i++) {
      const futureDate = new Date(currentYear, currentMonth + i, 1);
      const projectedMrr = Math.max(0, Math.round((intercept + slope * (mrrValues.length - 1 + i)) * 100) / 100);
      mrrTrend.push({
        month: monthLabel(futureDate),
        mrr: projectedMrr,
        isProjected: true,
      });
    }

    const projectedMrr3Months = mrrTrend[mrrTrend.length - 1].mrr;
    const projectedArrIn3Months = Math.round(projectedMrr3Months * 12 * 100) / 100;

    // ────────────────────────────────────────────────
    // 2. REVENUE PROJECTION
    // ────────────────────────────────────────────────

    const twelveMonthsAgo = new Date(currentYear, currentMonth - 12, 1).toISOString();
    const { data: paidInvoices } = await supabase
      .from("invoices")
      .select("total_inc_vat, created_at")
      .eq("status", "paid")
      .gte("created_at", twelveMonthsAgo);

    const monthlyRevenue = new Map<string, number>();
    for (const inv of paidInvoices ?? []) {
      const d = new Date(inv.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyRevenue.set(key, (monthlyRevenue.get(key) ?? 0) + (Number(inv.total_inc_vat) || 0));
    }

    const monthsWithData = Math.max(monthlyRevenue.size, 1);
    const totalRevenueYear = Array.from(monthlyRevenue.values()).reduce((s, v) => s + v, 0);
    const avgMonthlyRevenue = totalRevenueYear / monthsWithData;

    // Quarter progress
    const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
    const quarterMonthsElapsed = currentMonth - quarterStartMonth + 1;
    const quarterProgress = Math.round((quarterMonthsElapsed / 3) * 100);

    const projectedQuarterRevenue = Math.round(avgMonthlyRevenue * 3 * 100) / 100;
    const remainingMonths = 12 - currentMonth;
    const ytdRevenue = Array.from(monthlyRevenue.entries())
      .filter(([k]) => k.startsWith(`${currentYear}-`))
      .reduce((s, [, v]) => s + v, 0);
    const projectedAnnualRevenue = Math.round((ytdRevenue + avgMonthlyRevenue * remainingMonths) * 100) / 100;

    // ────────────────────────────────────────────────
    // 3. CUSTOMER GROWTH PROJECTION
    // ────────────────────────────────────────────────

    const monthlyNewUsers: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(currentYear, currentMonth - i, 1).toISOString();
      const monthEnd = new Date(currentYear, currentMonth - i + 1, 0).toISOString();

      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd);

      monthlyNewUsers.push(count ?? 0);
    }

    const { slope: userSlope, intercept: userIntercept } = linearRegression(monthlyNewUsers);
    const avgNewPerMonth = monthlyNewUsers.reduce((s, v) => s + v, 0) / Math.max(monthlyNewUsers.length, 1);
    const monthlyGrowthRate = avgNewPerMonth;

    // Project next 3 months of new customers
    let projectedNew3 = 0;
    for (let i = 1; i <= 3; i++) {
      projectedNew3 += Math.max(0, Math.round(userIntercept + userSlope * (monthlyNewUsers.length - 1 + i)));
    }

    const { count: currentTotalCustomers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const monthsToEoy = 12 - currentMonth;
    const projectedTotalCustomersEoy = (currentTotalCustomers ?? 0) + Math.round(avgNewPerMonth * monthsToEoy);

    // ────────────────────────────────────────────────
    // 4. CHURN PROJECTION
    // ────────────────────────────────────────────────

    const monthlyChurnRates: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(currentYear, currentMonth - i, 1).toISOString();
      const mEnd = new Date(currentYear, currentMonth - i + 1, 0).toISOString();

      const [
        { count: churned },
        { count: activeAtStart },
      ] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("*", { count: "exact", head: true })
          .in("status", ["cancelled", "expired"])
          .gte("updated_at", mStart)
          .lte("updated_at", mEnd),
        supabase
          .from("subscriptions")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")
          .lte("created_at", mStart),
      ]);

      const rate = (activeAtStart ?? 0) > 0
        ? ((churned ?? 0) / (activeAtStart ?? 1)) * 100
        : 0;
      monthlyChurnRates.push(Math.round(rate * 10) / 10);
    }

    // Weighted average (more recent months weighted heavier)
    const weights = [1, 1, 2, 2, 3, 4];
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    const projectedChurnRate = Math.round(
      monthlyChurnRates.reduce((s, r, i) => s + r * weights[i], 0) / totalWeight * 10
    ) / 10;

    const { count: currentActiveSubs } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    const activeSubs = currentActiveSubs ?? 0;
    const monthlyChurnFraction = projectedChurnRate / 100;
    const projectedChurnedNext3 = Math.round(activeSubs * monthlyChurnFraction * 3);
    const currentMrr = mrrHistory[mrrHistory.length - 1]?.mrr ?? 0;
    const projectedChurnMrr = Math.round(currentMrr * monthlyChurnFraction * 3 * 100) / 100;

    // ────────────────────────────────────────────────
    // 5. PIPELINE FORECAST
    // ────────────────────────────────────────────────

    const { data: pipelineLeads } = await supabase
      .from("leads")
      .select("lifecycle_stage, target_plan_id, plans!target_plan_id(price_cents)")
      .not("lifecycle_stage", "in", '("Klant","Niet Relevant")');

    const stageMap = new Map<string, { leads: number; totalPlanValue: number }>();
    for (const lead of pipelineLeads ?? []) {
      const stage = lead.lifecycle_stage;
      const existing = stageMap.get(stage) ?? { leads: 0, totalPlanValue: 0 };
      existing.leads++;
      const planPrice = (lead.plans as unknown as { price_cents: number } | null)?.price_cents ?? 0;
      existing.totalPlanValue += planPrice / 100;
      stageMap.set(stage, existing);
    }

    const pipelineForecast: PipelineForecast[] = [];
    let weightedPipelineValue = 0;
    let expectedNewMrr = 0;

    for (const [stage, data] of stageMap) {
      const convPct = STAGE_CONVERSION_WEIGHTS[stage] ?? 0.10;
      const expectedCustomers = Math.round(data.leads * convPct * 10) / 10;
      const expectedMrr = Math.round(data.totalPlanValue * convPct * 100) / 100;

      pipelineForecast.push({
        stage,
        leads: data.leads,
        conversionPct: Math.round(convPct * 100),
        expectedCustomers,
        expectedMrr,
      });

      weightedPipelineValue += data.totalPlanValue * convPct;
      expectedNewMrr += expectedMrr;
    }

    weightedPipelineValue = Math.round(weightedPipelineValue * 100) / 100;
    expectedNewMrr = Math.round(expectedNewMrr * 100) / 100;

    // ────────────────────────────────────────────────
    // 6. CASHFLOW FORECAST
    // ────────────────────────────────────────────────

    // Avg monthly expenses from receipts
    const sixMonthsAgo = new Date(currentYear, currentMonth - 6, 1).toISOString();
    const { data: recentReceipts } = await supabase
      .from("receipts")
      .select("amount_inc_vat")
      .gte("receipt_date", sixMonthsAgo);

    const totalExpenses6m = (recentReceipts ?? []).reduce(
      (s, r) => s + (Number(r.amount_inc_vat) || 0), 0
    );
    const avgMonthlyExpenses = totalExpenses6m / 6;

    // Open invoices expected income
    const { data: openInvoices } = await supabase
      .from("invoices")
      .select("total_inc_vat, due_date")
      .in("status", ["sent", "overdue"]);

    const cashflowForecast: CashflowMonth[] = [];
    for (let i = 1; i <= 3; i++) {
      const futureDate = new Date(currentYear, currentMonth + i, 1);
      const futureEndDate = new Date(currentYear, currentMonth + i + 1, 0);

      // Subscription income
      const subscriptionIncome = currentMrr;

      // Expected invoice payments this month (based on due dates)
      const invoiceIncome = (openInvoices ?? [])
        .filter((inv) => {
          const due = new Date(inv.due_date);
          return due >= futureDate && due <= futureEndDate;
        })
        .reduce((s, inv) => s + (Number(inv.total_inc_vat) || 0), 0);

      const totalIncome = Math.round((subscriptionIncome + invoiceIncome) * 100) / 100;
      const expenses = Math.round(avgMonthlyExpenses * 100) / 100;
      const net = Math.round((totalIncome - expenses) * 100) / 100;

      cashflowForecast.push({
        month: monthLabel(futureDate),
        income: totalIncome,
        expenses,
        net,
      });
    }

    // ────────────────────────────────────────────────
    // 7. SCENARIO PROJECTIONS
    // ────────────────────────────────────────────────

    const growthMultipliers = { conservative: 0.8, realistic: 1.0, optimistic: 1.2 };
    const churnMultipliers = { conservative: 1.2, realistic: 1.0, optimistic: 0.8 };

    const scenarios: ScenarioProjection[] = (
      [
        { label: "Conservatief", type: "conservative" as const },
        { label: "Realistisch", type: "realistic" as const },
        { label: "Optimistisch", type: "optimistic" as const },
      ] as const
    ).map(({ label, type }) => {
      const growthMul = growthMultipliers[type];
      const churnMul = churnMultipliers[type];

      const adjSlope = slope * growthMul;
      const adjChurn = monthlyChurnFraction * churnMul;

      // Compound MRR over 6 months
      let projMrr = currentMrr;
      for (let m = 0; m < 6; m++) {
        const newMrr = adjSlope > 0 ? adjSlope : avgNewPerMonth * (currentMrr / Math.max(activeSubs, 1)) * growthMul;
        projMrr = projMrr + newMrr - projMrr * adjChurn;
      }

      const projCustomers = Math.round(
        (currentTotalCustomers ?? 0) + avgNewPerMonth * 6 * growthMul - (currentTotalCustomers ?? 0) * adjChurn * 6
      );

      return {
        label,
        type,
        mrrIn6Months: Math.max(0, Math.round(projMrr * 100) / 100),
        customersIn6Months: Math.max(0, projCustomers),
      };
    });

    return {
      error: null,
      data: {
        mrrTrend,
        projectedArrIn3Months,
        projectedQuarterRevenue,
        projectedAnnualRevenue,
        quarterProgress,
        projectedNewCustomersNext3Months: projectedNew3,
        projectedTotalCustomersEoy,
        currentTotalCustomers: currentTotalCustomers ?? 0,
        monthlyGrowthRate: Math.round(monthlyGrowthRate * 10) / 10,
        projectedChurnRate,
        projectedChurnedCustomersNext3Months: projectedChurnedNext3,
        projectedChurnMrr,
        pipelineForecast,
        weightedPipelineValue,
        expectedNewMrr,
        cashflowForecast,
        scenarios,
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getForecasts" }) };
  }
}
