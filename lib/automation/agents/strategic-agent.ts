import { createServiceClient } from "@/lib/supabase/service";
import { Agent, SystemEventRow } from "../types";
import { sendStrategyBriefing } from "../../email/send-strategy";

/**
 * Agent 4: The Strategic Advisor
 * 
 * This agent aggregates sales and retention data to provide a CFO-level overview.
 * It identifies growth trends, churn risks, and pipeline value.
 */
export const strategicAgent: Agent = {
  name: "Strategic Advisor",
  description: "Aggregates MRR, churn, and pipeline data for strategic decision making.",
  targetEvents: ["system.weekly_briefing", "admin.manual_briefing"],
  
  run: async (event: SystemEventRow) => {
    const supabase = createServiceClient();
    console.log(`[Strategic Agent] Starting strategic analysis...`);

    try {
      // 1. Calculate MRR (Monthly Recurring Revenue)
      const { data: activeSubs } = await supabase
        .from("subscriptions")
        .select("plan:plans(price_cents)")
        .eq("status", "active");
      
      const mrrCents = (activeSubs || []).reduce((sum, sub) => {
        // @ts-ignore - Handle join structure
        const price = Array.isArray(sub.plan) ? sub.plan[0]?.price_cents : sub.plan?.price_cents;
        return sum + (price || 0);
      }, 0);

      // 2. Calculate MRR Churn
      const { data: churnedSubs } = await supabase
        .from("subscriptions")
        .select("plan:plans(price_cents)")
        .in("status", ["past_due", "cancelled"]);
      
      const churnCents = (churnedSubs || []).reduce((sum, sub) => {
        // @ts-ignore
        const price = Array.isArray(sub.plan) ? sub.plan[0]?.price_cents : sub.plan?.price_cents;
        return sum + (price || 0);
      }, 0);

      // 3. Calculate Pipeline Value
      const { data: pipelineLeads } = await supabase
        .from("leads")
        .select("plans!target_plan_id(price_cents)")
        .eq("lifecycle_stage", "Contact Gelegd"); // or "Plan Gekozen" if we have that stage
      
      const pipelineValueCents = (pipelineLeads || []).reduce((sum, lead) => {
        // @ts-ignore
        const price = Array.isArray(lead.plans) ? lead.plans[0]?.price_cents : lead.plans?.price_cents;
        return sum + (price || 0);
      }, 0);

      // 4. Counts
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: activeUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gt("updated_at", thirtyDaysAgo.toISOString());

      const { count: atRiskLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("lifecycle_stage", "On hold");

      // 5. Generate Insight Text (Simplified for now)
      const briefingText = `Current MRR is €${(mrrCents/100).toFixed(2)}. Churn risk stands at €${(churnCents/100).toFixed(2)}. Pipeline holds €${(pipelineValueCents/100).toFixed(2)} in potential revenue.`;

      // 6. Record Snapshot
      const { data: briefing, error: recordError } = await supabase
        .from("strategic_briefings")
        .insert({
          mrr_cents: mrrCents,
          churn_mrr_cents: churnCents,
          pipeline_value_cents: pipelineValueCents,
          active_users: activeUsers || 0,
          at_risk_leads: atRiskLeads || 0,
          briefing_text: briefingText
        })
        .select()
        .single();

      if (recordError) throw recordError;

      // 7. Send Briefing Email to Admin
      // Fetch admin email (for simplicity, we'll use a hardcoded fallback if needed)
      const { data: admins } = await supabase
        .from("profiles")
        .select("email")
        .eq("role", "admin")
        .limit(1);
      
      const adminEmail = admins?.[0]?.email || process.env.EMAIL_FROM || "admin@vat100.nl";

      await sendStrategyBriefing({
        email: adminEmail,
        mrr: `€${(mrrCents/100).toFixed(2)}`,
        churn: `€${(churnCents/100).toFixed(2)}`,
        pipeline: `€${(pipelineValueCents/100).toFixed(2)}`,
        users: activeUsers || 0,
        insight: briefingText
      });

      console.log(`[Strategic Agent] Analysis complete for briefing: ${briefing.id}`);
      return true;

    } catch (err) {
      console.error(`[Strategic Agent] Error:`, err);
      return false;
    }
  }
};
