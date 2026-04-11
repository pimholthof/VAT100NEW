import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createClient } from '@/lib/supabase/server';

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error !== null) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const { supabase, user } = auth;

    const compliance = await getComplianceStatus(supabase, user.id);
    
    return NextResponse.json({ compliance });
  } catch (error) {
    console.error('Compliance API Error:', error);
    return NextResponse.json(
      { error: 'Er is een fout opgetreden bij het ophalen van de compliance status.' },
      { status: 500 }
    );
  }
}

async function getComplianceStatus(supabase: SupabaseServer, userId: string) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.floor((now.getMonth() + 3) / 3);

  // Parallel data fetching
  const [
    missingReceiptsResult,
    vatReturnResult,
    hoursResult,
    unlinkedTransactionsResult,
    vatSuggestionsResult,
    categorySuggestionsResult
  ] = await Promise.all([
    // Missende bonnen
    supabase
      .from("receipts")
      .select("id, vendor_name, amount_inc_vat")
      .eq("user_id", userId)
      .is("storage_path", null)
      .gt("amount_inc_vat", 20),

    // BTW aangifte status
    supabase
      .from("vat_returns")
      .select("status, submitted_at")
      .eq("user_id", userId)
      .eq("year", currentYear)
      .eq("quarter", currentQuarter)
      .maybeSingle(),

    // Uren voortgang
    supabase
      .from("hours_log")
      .select("duration_minutes")
      .eq("user_id", userId)
      .gte("date", `${currentYear}-01-01`),

    // Ongekoppelde transacties
    supabase
      .from("bank_transactions")
      .select("id, description, amount")
      .eq("user_id", userId)
      .is("linked_invoice_id", null)
      .is("linked_receipt_id", null)
      .gte("date", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()), // Laatste 30 dagen

    // BTW suggesties
    supabase
      .from("vat_suggestions")
      .select("id, issue, suggested_vat_rate, confidence")
      .eq("user_id", userId)
      .eq("status", "pending"),

    // Categorisatie suggesties
    supabase
      .from("category_suggestions")
      .select("id, suggested_category, confidence")
      .eq("user_id", userId)
      .eq("status", "pending")
  ]);

  // Bereken componenten
  const missingReceipts = missingReceiptsResult.data || [];
  const vatReturn = vatReturnResult.data;
  const hours = hoursResult.data || [];
  const unlinkedTransactions = unlinkedTransactionsResult.data || [];
  const vatSuggestions = vatSuggestionsResult.data || [];
  const categorySuggestions = categorySuggestionsResult.data || [];

  // Uren berekening
  const totalMinutes = hours.reduce((sum: number, h: { duration_minutes: number }) => sum + (h.duration_minutes || 0), 0);
  const totalHours = totalMinutes / 60;
  const targetHours = 1225;
  const hoursProgress = (totalHours / targetHours) * 100;

  // Score berekening
  let score = 100;
  const issues = [];
  const recommendations = [];

  // Missende bonnen
  if (missingReceipts.length > 0) {
    score -= missingReceipts.length * 5;
    issues.push(`${missingReceipts.length} missende bonnetjes`);
    recommendations.push({
      type: "receipts",
      priority: "high",
      title: "Upload missende bonnetjes",
      description: `Je hebt ${missingReceipts.length} bonnetjes van meer dan €20 zonder bewijsstuk.`,
      action: "Ga naar de bonnen admin en upload de missende bewijsstukken."
    });
  }

  // BTW aangifte
  if (!vatReturn || vatReturn.status === 'draft') {
    score -= 15;
    issues.push('BTW-aangifte niet ingediend');
    recommendations.push({
      type: "vat",
      priority: "urgent",
      title: "Dien BTW-aangifte in",
      description: `BTW-aangifte Q${currentQuarter} ${currentYear} moet nog worden ingediend.`,
      action: "Ga naar de BTW aangifte pagina en dien in."
    });
  }

  // Urencriterium
  if (totalHours < targetHours * 0.8) {
    score -= 10;
    issues.push('Urencriterium loopt achter');
    const shortfall = Math.round(targetHours - totalHours);
    recommendations.push({
      type: "hours",
      priority: "medium",
      title: "Werk aan urencriterium",
      description: `Je hebt nog ${shortfall} uur nodig om de 1.225-uursnorm te halen.`,
      action: "Houd je uren nauwkeurig bij in het urenregister."
    });
  }

  // Ongekoppelde transacties
  if (unlinkedTransactions.length > 5) {
    score -= 5;
    issues.push(`${unlinkedTransactions.length} ongeëncategoriseerde transacties`);
    recommendations.push({
      type: "transactions",
      priority: "low",
      title: "Categoriseer transacties",
      description: `${unlinkedTransactions.length} transacties wachten op koppeling.`,
      action: "Ga naar de bankrekening en koppel transacties aan facturen/bonnen."
    });
  }

  // BTW suggesties
  if (vatSuggestions.length > 0) {
    recommendations.push({
      type: "vat_suggestions",
      priority: "medium",
      title: "Controleer BTW-tarieven",
      description: `${vatSuggestions.length} suggesties voor BTW-tarief correcties.`,
      action: "Bekijk de suggesties en pas waar nodig de BTW-tarieven aan."
    });
  }

  // Categorisatie suggesties
  if (categorySuggestions.length > 0) {
    recommendations.push({
      type: "category_suggestions",
      priority: "low",
      title: "Categorisatie suggesties",
      description: `${categorySuggestions.length} suggesties voor transactie categorisatie.`,
      action: "Bekijk en accepteer de categorisatie suggesties."
    });
  }

  score = Math.max(0, score);

  // Deadlines
  const deadlines = [];
  
  // BTW deadline
  const vatDeadline = getVatDeadline(currentQuarter, currentYear);
  const daysUntilVat = Math.ceil((new Date(vatDeadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  deadlines.push({
    type: "vat",
    description: `BTW-aangifte Q${currentQuarter} ${currentYear}`,
    date: vatDeadline,
    daysUntil: daysUntilVat,
    urgency: daysUntilVat <= 0 ? "overdue" : daysUntilVat <= 7 ? "urgent" : daysUntilVat <= 21 ? "warning" : "normal"
  });

  // Inkomstenbelasting deadline (1 mei)
  const taxDeadline = `${currentYear}-05-01`;
  const daysUntilTax = Math.ceil((new Date(taxDeadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilTax > 0 && daysUntilTax <= 30) {
    deadlines.push({
      type: "income_tax",
      description: `Inkomstenbelasting ${currentYear - 1}`,
      date: taxDeadline,
      daysUntil: daysUntilTax,
      urgency: daysUntilTax <= 7 ? "urgent" : "warning"
    });
  }

  // KIA deadline (31 december)
  if (now.getMonth() >= 9) { // Vanaf oktober
    const kiaDeadline = `${currentYear}-12-31`;
    const daysUntilKia = Math.ceil((new Date(kiaDeadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    deadlines.push({
      type: "kia",
      description: "KIA investeringsdeadline",
      date: kiaDeadline,
      daysUntil: daysUntilKia,
      urgency: daysUntilKia <= 30 ? "warning" : "normal"
    });
  }

  return {
    score,
    issues,
    recommendations: recommendations.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
    }),
    lastChecked: now.toISOString(),
    metrics: {
      missingReceipts: missingReceipts.length,
      unlinkedTransactions: unlinkedTransactions.length,
      vatSuggestions: vatSuggestions.length,
      categorySuggestions: categorySuggestions.length,
      hoursProgress: {
        current: Math.round(totalHours),
        target: targetHours,
        percentage: Math.round(hoursProgress * 10) / 10,
        onTrack: totalHours >= targetHours * 0.8
      },
      vatStatus: {
        currentQuarter,
        status: vatReturn?.status || 'missing',
        submittedAt: vatReturn?.submitted_at
      }
    },
    deadlines
  };
}

function getVatDeadline(quarter: number, year: number): string {
  const deadlineMonths = [4, 7, 10, 1]; // April, July, October, January
  const deadlineMonth = deadlineMonths[quarter - 1];
  const deadlineYear = deadlineMonth === 1 ? year + 1 : year;
  const deadlineDate = new Date(deadlineYear, deadlineMonth, 0);
  return deadlineDate.toISOString().split('T')[0];
}
