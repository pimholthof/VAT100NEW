import { createServiceClient } from "@/lib/supabase/service";
import { Agent, SystemEventRow } from "../types";
import { v4 as uuidv4 } from "uuid";

/**
 * Agent 1: The Navigator
 * 
 * This agent handles the automated outreach for new leads.
 * It generates a secure registration token and "sends" the plan selection link.
 */
export const navigatorAgent: Agent = {
  name: "Navigator Agent",
  description: "Handles initial outreach and automated plan selection links.",
  targetEvents: ["lead.waitlist_signup"],
  
  run: async (event: SystemEventRow) => {
    const supabase = createServiceClient();
    const { email } = event.payload;

    if (!email) {
      console.error(`[Agent 1] No email found for lead.`);
      return false;
    }


    try {
      // 1. Find the lead
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select("id")
        .eq("email", email)
        .single();

      if (leadError || !lead) {
        console.error(`[Agent 1] Lead not found in database: ${email}`);
        return false;
      }

      // 2. Generate secure token
      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const { error: tokenError } = await supabase
        .from("lead_tokens")
        .insert({
          lead_id: lead.id,
          token: token,
          expires_at: expiresAt.toISOString()
        });

      if (tokenError) {
        console.error(`[Agent 1] Error creating lead token:`, tokenError);
        return false;
      }

      // 3. Update lead lifecycle stage to "Link Verstuurd"
      const { error: stageError } = await supabase
        .from("leads")
        .update({
          lifecycle_stage: "Link Verstuurd",
          updated_at: new Date().toISOString()
        })
        .eq("id", lead.id);

      if (stageError) {
        console.error(`[Agent 1] Error updating lead stage:`, stageError);
        return false;
      }

      // 4. Log Activity
      await supabase.from("lead_activities").insert({
        lead_id: lead.id,
        activity_type: "email",
        description: "Automated 'Kies Plan' link verstuurd via Agent 1.",
        metadata: { token_id: token }
      });

      // 5. In a real scenario, trigger Resend/SendGrid here
      
      return true;

    } catch (err) {
      console.error(`[Agent 1] Unexpected error:`, err);
      return false;
    }
  }
};
