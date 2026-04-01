import { createServiceClient } from "@/lib/supabase/service";
import { Agent, SystemEventRow } from "../types";
import { sendAuditReport } from "../../email/send-audit";

/**
 * Agent 5: The Tax Auditor
 * 
 * This agent identifies missing receipts, unlinked invoices, and urencriterium progress.
 * It ensures the business is "Fiscus-Proof" before quarterly filing.
 */
export const taxAuditorAgent: Agent = {
  name: "Tax Auditor",
  description: "Scans financial records for missing receipts, unlinked transactions, and urencriterium gaps.",
  targetEvents: ["system.quarterly_audit", "admin.manual_audit"],

  run: async (event: SystemEventRow) => {
    const supabase = createServiceClient();
    const userId = event.user_id;
    if (!userId) return false;

    console.log(`[Tax Auditor] Starting audit for user ${userId}...`);

    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentQuarter = Math.floor((now.getMonth() + 3) / 3);

      // 1. Check missing receipts (Amount > 20, missing storage_path)
      const { data: missingReceipts } = await supabase
        .from("receipts")
        .select("id, vendor_name, amount_inc_vat, receipt_date")
        .eq("user_id", userId)
        .is("storage_path", null)
        .gt("amount_inc_vat", 20);

      const findings: { type: "receipt" | "invoice" | "hour"; title: string; description: string; severity: "low" | "medium" | "high" }[] = (missingReceipts || []).map(r => ({
        type: "receipt",
        title: `Missend bonnetje: ${r.vendor_name || "Onbekend"}`,
        description: `Uitgave van €${r.amount_inc_vat.toFixed(2)} op ${new Date(r.receipt_date).toLocaleDateString("nl-NL")} heeft geen bewijsstuk.`,
        severity: r.amount_inc_vat > 200 ? "high" : "medium"
      }));

      // 2. Check unlinked invoices (Paid, but no transaction_id)
      const { data: unlinkedInvoices } = await supabase
        .from("invoices")
        .select("id, invoice_number, total_inc_vat, client:clients(name)")
        .eq("user_id", userId)
        .eq("status", "paid")
        .is("linked_transaction_id", null);

      (unlinkedInvoices || []).forEach(inv => {
        findings.push({
          type: "invoice",
          title: `Betaalde factuur zonder bank-koppeling`,
          description: `Factuur ${inv.invoice_number} van €${inv.total_inc_vat.toFixed(2)} is als betaald gemarkeerd maar niet gekoppeld aan de bank.`,
          severity: "low"
        });
      });

      // 3. Check hours progress (1225h norm)
      // Expect approx 25 hours per week passed in the year
      const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
      const weeksPassed = Math.max(1, Math.floor(dayOfYear / 7));
      const targetHours = weeksPassed * 24;

      const { data: hours } = await supabase
        .from("hours_log")
        .select("duration_minutes")
        .eq("user_id", userId)
        .gte("date", `${currentYear}-01-01`);

      const totalMinutes = (hours || []).reduce((sum, h) => sum + (h.duration_minutes || 0), 0);
      const totalHours = totalMinutes / 60;

      if (totalHours < targetHours * 0.8) {
        findings.push({
          type: "hour",
          title: `Urencriterium loopt achter`,
          description: `Je hebt tot nu toe ${Math.round(totalHours)} uur gelogd. Om op schema te blijven voor de 1.225-uursnorm zou je nu op ca. ${Math.round(targetHours)} uur moeten zitten.`,
          severity: "medium"
        });
      }

      // 4. Calculate Score
      let score = 100;
      score -= (missingReceipts || []).length * 5;
      score -= (unlinkedInvoices || []).length * 2;
      if (totalHours < targetHours * 0.8) score -= 15;
      score = Math.max(0, score);

      // 5. Store results
      const { error: recordError } = await supabase
        .from("tax_audits")
        .insert({
          user_id: userId,
          quarter: currentQuarter,
          year: currentYear,
          score,
          findings: {
            missing_receipts: missingReceipts || [],
            unlinked_invoices: unlinkedInvoices || [],
            hours_gap: Math.max(0, targetHours - totalHours),
            anomalies: []
          },
          status: score > 90 ? "Gedaan" : score > 70 ? "Aandacht Vereist" : "Kritiek"
        });

      if (recordError) throw recordError;

      // 6. Send Email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .single();
      
      const email = profile?.email || process.env.EMAIL_FROM || "admin@vat100.nl";

      await sendAuditReport({
        email,
        quarter: currentQuarter,
        year: currentYear,
        score,
        findings: findings.slice(0, 5) // Send top 5 findings
      });

      console.log(`[Tax Auditor] Audit complete for user ${userId}. Score: ${score}%`);
      return true;

    } catch (err) {
      console.error(`[Tax Auditor] Error:`, err);
      return false;
    }
  }
};
