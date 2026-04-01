import { createServiceClient } from "@/lib/supabase/service";
import { Agent, SystemEventRow } from "../types";

/**
 * Agent 10: Qualification & Sifting
 * 
 * This agent automatically scores new leads based on their profile.
 */
export const qualificationAgent: Agent = {
  name: "Qualification Agent",
  description: "Scores new leads from the waitlist based on email quality and profile markers.",
  targetEvents: ["lead.waitlist_signup"],
  
  run: async (event: SystemEventRow) => {
    const supabase = createServiceClient();
    const email = event.payload.email as string | undefined;
    const name = event.payload.name as string | undefined;

    if (!email) {
      console.error(`[Agent 10] No email found for lead.`);
      return false;
    }

    console.log(`[Agent 10] Qualifying new lead: ${email}...`);

    try {
      // 1. Initial heuristic scoring
      let scoreFit = 0.5; // Base score
      const businessEmailDomains = ["gmail.com", "outlook.com", "hotmail.com", "icloud.com"];
      const isBusinessEmail = !businessEmailDomains.some(d => email.toLowerCase().endsWith(d));
      
      if (isBusinessEmail) {
        scoreFit += 0.3; // Bonus for custom domain
      }

      // 2. Profile scoring (simple check for now)
      if (name && name.length > 2) {
        scoreFit += 0.1;
      }

      // 3. Update the lead in the database
      const { error } = await supabase
        .from("leads")
        .update({
          score_fit: Math.min(scoreFit, 1.0),
          metadata: {
            ...event.payload,
            qualified_at: new Date().toISOString(),
            qualification_notes: isBusinessEmail ? "High fit (Business Domain)" : "Potential solo-entrepreneur"
          }
        })
        .eq("email", email);

      if (error) {
        console.error(`[Agent 10] Error updating lead:`, error);
        return false;
      }

      console.log(`[Agent 10] Successfully qualified ${email} with score: ${scoreFit}`);
      return true;

    } catch (err) {
      console.error(`[Agent 10] Unexpected error:`, err);
      return false;
    }
  }
};
