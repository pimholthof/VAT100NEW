import { createServiceClient } from "@/lib/supabase/service";
import { Agent, SystemEventRow } from "../types";

/**
 * Agent 8: Fiscale Deadline Monitor
 * 
 * Monitort alle fiscale deadlines en stuurt proactieve herinneringen.
 * Bereidt automatisch documenten voor en geeft compliance status.
 */
export const deadlineMonitorAgent: Agent = {
  name: "Deadline Monitor",
  description: "Monitort fiscale deadlines en stuurt proactieve herinneringen met voorbereidingen.",
  targetEvents: ["system.daily_deadline_check", "user.profile_updated", "invoice.created", "receipt.uploaded"],

  run: async (event: SystemEventRow) => {
    const supabase = createServiceClient();
    const userId = event.user_id;
    if (!userId) return false;

    try {
      const alerts = [];

      if (event.event_type === "system.daily_deadline_check") {
        await performDailyDeadlineCheck(userId);
      } else if (event.event_type === "user.profile_updated") {
        await checkInitialCompliance(userId);
      } else if (event.event_type === "invoice.created" || event.event_type === "receipt.uploaded") {
        await updateComplianceStatus(userId);
      }

      return true;
    } catch (err) {
      console.error(`[Deadline Monitor] Error:`, err);
      return false;
    }
  }
};

// ─── Deadline checking functies ───

async function performDailyDeadlineCheck(userId: string) {
  const supabase = createServiceClient();
  const now = new Date();
  
  // Check BTW deadlines
  await checkVatDeadlines(userId, now);
  
  // Check Inkomstenbelasting deadline
  await checkIncomeTaxDeadlines(userId, now);
  
  // Check Urencriterium voortgang
  await checkHoursProgress(userId, now);
  
  // Check KIA deadline
  await checkKiaDeadline(userId, now);
  
  // Check compliance status
  await updateComplianceStatus(userId);
}

async function checkVatDeadlines(userId: string, now: Date) {
  const supabase = createServiceClient();
  
  // Bepaal huidig kwartaal en deadline (einde volgende maand)
  const currentQuarter = Math.floor((now.getMonth() + 3) / 3);
  const currentYear = now.getFullYear();
  
  // BTW deadline is einde volgende maand na kwartaal
  const deadlineMonths = [4, 7, 10, 1]; // April, July, October, January (volgend jaar)
  const deadlineMonth = deadlineMonths[currentQuarter - 1];
  const deadlineYear = deadlineMonth === 1 ? currentYear + 1 : currentYear;
  const deadlineDate = new Date(deadlineYear, deadlineMonth - 1, 0); // Laatste dag van de maand
  
  // Check of er al een aangifte is voor dit kwartaal
  const { data: existingReturn } = await supabase
    .from("vat_returns")
    .select("status, submitted_at")
    .eq("user_id", userId)
    .eq("year", currentYear)
    .eq("quarter", currentQuarter)
    .maybeSingle();

  if (existingReturn?.status === "submitted") {
    return; // Al ingediend
  }

  // Bereken dagen tot deadline
  const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Genereer alerts op basis van tijdsdruk
  if (daysUntilDeadline <= 0) {
    await createVatAlert(userId, "OVERDUE", currentQuarter, currentYear, 0);
  } else if (daysUntilDeadline <= 7) {
    await createVatAlert(userId, "URGENT", currentQuarter, currentYear, daysUntilDeadline);
  } else if (daysUntilDeadline <= 21) {
    await createVatAlert(userId, "WARNING", currentQuarter, currentYear, daysUntilDeadline);
  } else if (daysUntilDeadline <= 60) {
    await createVatAlert(userId, "REMINDER", currentQuarter, currentYear, daysUntilDeadline);
  }
}

async function checkIncomeTaxDeadlines(userId: string, now: Date) {
  const supabase = createServiceClient();
  const currentYear = now.getFullYear();
  
  // Inkomstenbelasting deadline is 1 mei (of uitstel tot 1 september)
  const deadlineDate = new Date(currentYear, 4, 1); // 1 mei
  
  // Check of er al een aangifte is dit jaar
  const { data: existingReturn } = await supabase
    .from("tax_returns")
    .select("status, submitted_at")
    .eq("user_id", userId)
    .eq("year", currentYear - 1) // Vorig jaar aangifte
    .maybeSingle();

  if (existingReturn?.status === "submitted") {
    return;
  }

  const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilDeadline <= 30 && daysUntilDeadline > 0) {
    await createTaxAlert(userId, "INCOME_TAX", currentYear - 1, daysUntilDeadline);
  }
}

async function checkHoursProgress(userId: string, now: Date) {
  const supabase = createServiceClient();
  const currentYear = now.getFullYear();
  
  // Bereken verwachte uren tot nu toe
  const dayOfYear = Math.floor((now.getTime() - new Date(currentYear, 0, 0).getTime()) / 86400000);
  const weeksPassed = Math.max(1, Math.floor(dayOfYear / 7));
  const targetHours = weeksPassed * 24; // 24 uur per week voor 1225 uur/jaar
  
  // Haal huidige uren op
  const { data: hours } = await supabase
    .from("hours_log")
    .select("duration_minutes")
    .eq("user_id", userId)
    .gte("date", `${currentYear}-01-01`);

  const totalMinutes = (hours || []).reduce((sum, h) => sum + (h.duration_minutes || 0), 0);
  const totalHours = totalMinutes / 60;
  const progressPercentage = (totalHours / 1225) * 100;
  
  // Alert als we achterlopen
  if (totalHours < targetHours * 0.8) {
    const shortfall = Math.round(targetHours - totalHours);
    await createHoursAlert(userId, shortfall, Math.round(totalHours), progressPercentage);
  }
}

async function checkKiaDeadline(userId: string, now: Date) {
  const supabase = createServiceClient();
  const currentYear = now.getFullYear();
  
  // KIA investeringen moeten voor 31 december
  const deadlineDate = new Date(currentYear, 11, 31);
  const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilDeadline <= 90 && daysUntilDeadline > 0) {
    // Check huidige investeringen
    const { data: investments } = await supabase
      .from("receipts")
      .select("amount_ex_vat")
      .eq("user_id", userId)
      .eq("cost_code", 4230) // Investeringen
      .gte("receipt_date", `${currentYear}-01-01`);

    const totalInvestments = (investments || []).reduce((sum, inv) => sum + (Number(inv.amount_ex_vat) || 0), 0);
    
    // Suggestie voor KIA optimalisatie
    if (totalInvestments < 2400) { // Onder de eerste KIA schijf
      await createKiaAlert(userId, totalInvestments, daysUntilDeadline);
    }
  }
}

// ─── Compliance status ───

async function updateComplianceStatus(userId: string) {
  const supabase = createServiceClient();
  const now = new Date();
  
  // Bereken compliance score
  let score = 100;
  const issues = [];

  // Check missende bonnen (> €20)
  const { data: missingReceipts } = await supabase
    .from("receipts")
    .select("id")
    .eq("user_id", userId)
    .is("storage_path", null)
    .gt("amount_inc_vat", 20);

  if (missingReceipts && missingReceipts.length > 0) {
    score -= missingReceipts.length * 5;
    issues.push(`${missingReceipts.length} missende bonnetjes`);
  }

  // Check ongekoppelde transacties
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: unlinkedTransactions } = await supabase
    .from("bank_transactions")
    .select("id")
    .eq("user_id", userId)
    .is("linked_invoice_id", null)
    .is("linked_receipt_id", null)
    .gte("date", thirtyDaysAgo.toISOString());

  if (unlinkedTransactions && unlinkedTransactions.length > 5) {
    score -= 10;
    issues.push(`${unlinkedTransactions.length} ongeëncategoriseerde transacties`);
  }

  // Check BTW aangifte status
  const currentQuarter = Math.floor((now.getMonth() + 3) / 3);
  const { data: vatReturn } = await supabase
    .from("vat_returns")
    .select("status")
    .eq("user_id", userId)
    .eq("year", now.getFullYear())
    .eq("quarter", currentQuarter)
    .maybeSingle();

  if (!vatReturn || vatReturn.status === "draft") {
    score -= 15;
    issues.push("BTW-aangifte niet ingediend");
  }

  score = Math.max(0, score);

  // Update compliance status
  await supabase.from("compliance_status").upsert({
    user_id: userId,
    score,
    issues,
    last_checked: now.toISOString(),
    updated_at: now.toISOString()
  });
}

async function checkInitialCompliance(userId: string) {
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("btw_number, kvk_number, full_name")
    .eq("id", userId)
    .single();

  const missingFields = [];
  if (!profile?.btw_number) missingFields.push("BTW-nummer");
  if (!profile?.kvk_number) missingFields.push("KvK-nummer");
  if (!profile?.full_name) missingFields.push("Volledige naam");

  if (missingFields.length > 0) {
    await createComplianceAlert(userId, "MISSING_PROFILE", missingFields);
  }
}

// ─── Alert creation functies ───

async function createVatAlert(userId: string, urgency: string, quarter: number, year: number, daysUntil: number) {
  const supabase = createServiceClient();
  
  const messages = {
    "OVERDUE": `BTW-aangifte Q${quarter} ${year} is OVERDUE! Direct indienen vereist.`,
    "URGENT": `BTW-aangifte Q${quarter} ${year} moet binnen ${daysUntil} dagen worden ingediend.`,
    "WARNING": `BTW-aangifte Q${quarter} ${year} moet binnen ${daysUntil} dagen worden ingediend.`,
    "REMINDER": `BTW-aangifte Q${quarter} ${year} staat klaar. Deadline over ${daysUntil} dagen.`
  };

  await supabase.from("deadline_alerts").insert({
    user_id: userId,
    alert_type: "vat_deadline",
    urgency,
    message: messages[urgency as keyof typeof messages],
    deadline_date: new Date(year, (quarter * 3), 0).toISOString(),
    quarter,
    year,
    status: "active"
  });

  // Action feed
  await supabase.from("action_feed").insert({
    user_id: userId,
    type: "deadline_alert",
    title: `BTW Deadline ${urgency}`,
    description: messages[urgency as keyof typeof messages],
    ai_confidence: 1.0,
  });
}

async function createTaxAlert(userId: string, type: string, year: number, daysUntil: number) {
  const supabase = createServiceClient();
  
  await supabase.from("deadline_alerts").insert({
    user_id: userId,
    alert_type: "income_tax_deadline",
    urgency: "WARNING",
    message: `Inkomstenbelasting ${year} moet binnen ${daysUntil} dagen worden ingediend.`,
    deadline_date: new Date(new Date().getFullYear(), 4, 1).toISOString(),
    year,
    status: "active"
  });
}

async function createHoursAlert(userId: string, shortfall: number, currentHours: number, progress: number) {
  const supabase = createServiceClient();
  
  await supabase.from("deadline_alerts").insert({
    user_id: userId,
    alert_type: "hours_progress",
    urgency: "WARNING",
    message: `Urencriterium: je loopt ${shortfall} uur achter. Huidige stand: ${currentHours} uur (${progress.toFixed(1)}%).`,
    status: "active"
  });
}

async function createKiaAlert(userId: string, currentInvestments: number, daysUntil: number) {
  const supabase = createServiceClient();
  
  await supabase.from("deadline_alerts").insert({
    user_id: userId,
    alert_type: "kia_deadline",
    urgency: "INFO",
    message: `KIA tip: je hebt €${currentInvestments.toFixed(0)} geïnvesteerd. Nog ${daysUntil} dagen om te optimaliseren voor belastingvoordeel.`,
    status: "active"
  });
}

async function createComplianceAlert(userId: string, type: string, missingFields: string[]) {
  const supabase = createServiceClient();
  
  await supabase.from("deadline_alerts").insert({
    user_id: userId,
    alert_type: "compliance",
    urgency: "WARNING",
    message: `Profiel incompleet: ${missingFields.join(", ")}`,
    status: "active"
  });
}
