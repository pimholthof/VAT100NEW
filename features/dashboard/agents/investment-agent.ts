import type { ActionResult } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { calculateZZPTaxProjection, type Investment } from "@/lib/tax/dutch-tax-2026";
import {
  calculateInvestmentTaxSaving,
  calculateKIAThresholdGap,
  generateKIAThresholdDescription,
  generateInvestmentSuggestionDescription,
  toHumanReviewTitle,
  toHumanReviewDescription,
} from "@/lib/tax/fiscal-claim-validator";
import { getErrorMessage } from "@/lib/utils/errors";
import * as Sentry from "@sentry/nextjs";

/**
 * Agent 4: The Investment Agent (Tax Shield).
 * Now uses assets DB totals instead of scanning receipts by cost_code.
 */
export async function runInvestmentAgent(userId: string, externalSupabase?: Awaited<ReturnType<typeof createClient>>): Promise<ActionResult<{ created: number }>> {
  try {
    const supabase = externalSupabase || await createClient();
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    // Fetch revenue
    const { data: profitData } = await supabase
      .from("invoices")
      .select("total_inc_vat, vat_amount")
      .eq("user_id", userId)
      .eq("status", "paid")
      .gte("issue_date", yearStart);

    if (!profitData || profitData.length === 0) return { error: null, data: { created: 0 } };

    const totalRevenueExVat = profitData.reduce(
      (sum, inv) => sum + (Number(inv.total_inc_vat) - Number(inv.vat_amount)), 0
    );

    // Fetch KIA-eligible investments from assets table (>= €450, this year)
    const { data: kiaAssets } = await supabase
      .from("assets")
      .select("aanschaf_prijs")
      .eq("user_id", userId)
      .gte("aanschaf_datum", yearStart)
      .lte("aanschaf_datum", yearEnd)
      .gte("aanschaf_prijs", 450);

    const totalInvestments = (kiaAssets ?? []).reduce(
      (sum, a) => sum + (Number(a.aanschaf_prijs) || 0), 0
    );

    // Check for existing pending tax alerts
    const { data: existing } = await supabase
      .from("action_feed")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "tax_alert")
      .eq("status", "pending");

    if (existing && existing.length > 0) return { error: null, data: { created: 0 } };

    let created = 0;

    // Alert 1: KIA threshold proximity — deterministic berekening
    const kiaGap = calculateKIAThresholdGap(totalInvestments);
    if (kiaGap && totalInvestments > 2500) {
      const confidence = 0.95;
      const title = toHumanReviewTitle("KIA-drempel bijna bereikt!", confidence);
      const description = toHumanReviewDescription(
        generateKIAThresholdDescription(totalInvestments, kiaGap),
        confidence,
      );
      await supabase.from("action_feed").insert({
        user_id: userId,
        type: "tax_alert",
        title,
        description,
        ai_confidence: confidence,
        status: "pending",
      });
      // Audit trail
      import("@/lib/audit/agent-audit").then((m) =>
        m.logAgentDecision({
          agentName: "InvestmentAgent",
          actionType: "tax_alert",
          userId,
          confidence,
          inputSummary: { totalInvestments, kiaGapNodig: kiaGap.nodig },
          outputSummary: { type: "kia_threshold", potentialKIA: kiaGap.potentialKIA },
          wasAutoExecuted: false,
        }).catch(() => {})
      );
      created++;
    }

    // Alert 2: Investering-suggestie — bereken echte belastingbesparing
    if (totalRevenueExVat > 10000 && totalInvestments < 2901) {
      // Haal kosten op voor belastbaar inkomen berekening
      const { data: costsData } = await supabase
        .from("receipts")
        .select("amount_ex_vat")
        .eq("user_id", userId)
        .gte("receipt_date", yearStart)
        .lte("receipt_date", yearEnd);

      const jaarKostenExBtw = (costsData ?? []).reduce(
        (sum, rec) => sum + (Number(rec.amount_ex_vat) || 0), 0
      );

      const maandenVerstreken = now.getMonth() + 1;
      const projection = calculateZZPTaxProjection({
        jaarOmzetExBtw: totalRevenueExVat,
        jaarKostenExBtw,
        investeringen: (kiaAssets ?? []).map((a, i) => ({
          id: String(i),
          omschrijving: "Bestaande investering",
          aanschafprijs: Number(a.aanschaf_prijs) || 0,
          aanschafDatum: yearStart,
          levensduur: 5,
          restwaarde: 0,
        })) as Investment[],
        maandenVerstreken,
        huidigJaar: currentYear,
      });

      const proposedInvestment = 1000;
      const saving = calculateInvestmentTaxSaving({
        currentTotalInvestments: totalInvestments,
        proposedAdditionalInvestment: proposedInvestment,
        currentBelastbaarInkomen: projection.belastbaarInkomen,
      });

      const confidence = 0.9;
      const title = toHumanReviewTitle("Fiscale Optimalisatie: Investering", confidence);
      const description = toHumanReviewDescription(
        generateInvestmentSuggestionDescription(totalRevenueExVat, proposedInvestment, saving),
        confidence,
      );
      await supabase.from("action_feed").insert({
        user_id: userId,
        type: "tax_alert",
        title,
        description,
        ai_confidence: confidence,
        status: "pending",
      });
      // Audit trail
      import("@/lib/audit/agent-audit").then((m) =>
        m.logAgentDecision({
          agentName: "InvestmentAgent",
          actionType: "tax_alert",
          userId,
          confidence,
          inputSummary: { totalRevenueExVat, totalInvestments, proposedInvestment },
          outputSummary: { type: "investment_suggestion", kiaDelta: saving.kiaDelta, taxSaving: saving.taxSaving },
          wasAutoExecuted: false,
        }).catch(() => {})
      );
      created++;
    }

    return { error: null, data: { created } };
  } catch (err) {
    Sentry.captureException(err, { tags: { agent: "investment", userId } });
    return { error: getErrorMessage(err) };
  }
}
