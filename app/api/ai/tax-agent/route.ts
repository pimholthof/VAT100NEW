import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createClient } from '@/lib/supabase/server';
import { getBtwOverview } from '@/features/tax/actions';
import type { QuarterStats } from '@/features/tax/actions';
import { calculateZZPTaxProjection, type Investment, type TaxProjection, type Bespaartip } from '@/lib/tax/dutch-tax-2026';

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error !== null) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const { supabase, user } = auth;

    const body = await request.json();
    const { message, context } = body;

    // Detecteer of dit een belastingvraag is
    const taxKeywords = ['belasting', 'btw', 'inkomen', 'aftrek', 'zzp', 'omzet', 'investering', 'kia'];
    const isTaxQuestion = taxKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (!isTaxQuestion) {
      // Geen deterministische tax-vraag → probeer een Claude-antwoord
      // (Complete of hoger, wordt afgetrokken van maandelijkse chat-quota).
      const { invokeChat } = await import("@/lib/ai/chat");
      const chatResult = await invokeChat({
        systemPrompt: `Je bent de slimme boekhouder van VAT100. Je antwoordt beknopt en in het Nederlands.

Rol & grenzen:
- Je helpt Nederlandse ZZP'ers (freelancers creatieve sector) met fiscale, boekhoudkundige en administratieve vragen.
- Je geeft nooit juridisch advies. Bij onzekerheid verwijs je naar een belastingadviseur of de Belastingdienst.
- Specifieke bedragen vertel je alleen op basis van data uit VAT100; gok niets.
- Bij vragen buiten het fiscale/boekhoudkundige domein stuur je de gebruiker beleefd terug.

Stijl: kort, zakelijk, geen emoji. Maximaal 5 zinnen tenzij de vraag expliciet om detail vraagt.`,
        messages: [{ role: "user", content: message }],
        maxTokens: 512,
      });

      if (chatResult.error !== null) {
        // Plan-gate of quota-fout → geef een vriendelijke canned reply i.p.v. 500
        return NextResponse.json({
          response: chatResult.error,
          isTaxResponse: false,
        });
      }

      return NextResponse.json({
        response: chatResult.data?.text ?? "",
        isTaxResponse: false,
        remainingQuota: chatResult.data?.remainingQuota ?? null,
      });
    }

    // Haal gebruikersdata op
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;
    const maandenVerstreken = now.getMonth() + 1;

    const [invoicesRes, receiptsRes, profileRes] = await Promise.all([
      // Facturen dit jaar
      supabase
        .from("invoices")
        .select("subtotal_ex_vat, vat_amount, status")
        .eq("user_id", user.id)
        .in("status", ["sent", "paid"])
        .gte("issue_date", yearStart)
        .lte("issue_date", yearEnd),

      // Bonnen dit jaar
      supabase
        .from("receipts")
        .select("amount_ex_vat, vat_amount, cost_code")
        .eq("user_id", user.id)
        .gte("receipt_date", yearStart)
        .lte("receipt_date", yearEnd),

      // Profiel data
      supabase
        .from("profiles")
        .select("full_name, btw_number, kvk_number")
        .eq("id", user.id)
        .single()
    ]);

    if (invoicesRes.error || receiptsRes.error || profileRes.error) {
      return NextResponse.json({ error: "Data ophalen mislukt" }, { status: 500 });
    }

    // Bereken totaal
    const jaarOmzetExBtw = (invoicesRes.data ?? []).reduce(
      (sum, inv) => sum + (Number(inv.subtotal_ex_vat) || 0),
      0
    );

    const jaarKostenExBtw = (receiptsRes.data ?? []).reduce(
      (sum, rec) => sum + (Number(rec.amount_ex_vat) || 0),
      0
    );

    // Investeringen (cost_code 4230)
    const investeringen: Investment[] = (receiptsRes.data ?? [])
      .filter(rec => rec.cost_code === 4230)
      .map((rec, index) => ({
        id: `investment_${index}_${Date.now()}`,
        omschrijving: 'Investering',
        aanschafprijs: Number(rec.amount_ex_vat) || 0,
        aanschafDatum: new Date().toISOString().split('T')[0],
        levensduur: 5,
        restwaarde: 0
      }));

    // Probeer bedragen te extraheren uit message
    const extractedInput = extractTaxInput(message, context);
    const useExtracted = extractedInput && extractedInput.jaarOmzetExBtw > 0;

    const taxInput = useExtracted ? extractedInput : {
      jaarOmzetExBtw,
      jaarKostenExBtw,
      investeringen,
      maandenVerstreken,
      kilometerAftrek: context?.kilometerAftrek || 0
    };

    // Berekening
    const projection = calculateZZPTaxProjection(taxInput);

    // Haal compliance status
    const compliance = await getComplianceStatus(supabase, user.id);

    // Haal BTW overzicht
    const btwOverview = await getBtwOverview();
    const btwData = btwOverview.error ? null : btwOverview.data;

    // Formatteer advies
    const formattedAdvice = formatTaxAdvice(projection, compliance, btwData ?? null, profileRes.data);

    return NextResponse.json({
      response: formattedAdvice,
      taxData: projection,
      compliance,
      isTaxResponse: true,
      usedExtractedData: useExtracted
    });

  } catch (error) {
    console.error('Tax Agent Error:', error);
    return NextResponse.json(
      { error: 'Er is een fout opgetreden bij het verwerken van uw vraag.' },
      { status: 500 }
    );
  }
}

function extractTaxInput(message: string, context: Record<string, unknown> | undefined) {
  const omzetMatch = message.match(/€?\s*([\d,.]+)\s*(?:euro|omzet|turnover)/i);
  const kostenMatch = message.match(/€?\s*([\d,.]+)\s*(?:euro|kosten|costs)/i);

  if (omzetMatch) {
    const omzet = parseFloat(omzetMatch[1].replace(',', '.'));
    const kosten = kostenMatch ? 
      parseFloat(kostenMatch[1].replace(',', '.')) : 
      omzet * 0.3; // Standaard 30%

    return {
      jaarOmzetExBtw: omzet,
      jaarKostenExBtw: kosten,
      investeringen: (Array.isArray(context?.investeringen) ? context.investeringen : []) as Investment[],
      maandenVerstreken: typeof context?.maandenVerstreken === 'number' ? context.maandenVerstreken : 12,
      kilometerAftrek: typeof context?.kilometerAftrek === 'number' ? context.kilometerAftrek : 0
    };
  }

  return null;
}

async function getComplianceStatus(supabase: SupabaseServer, userId: string) {
  try {
    // Check missende bonnen
    const { data: missingReceipts } = await supabase
      .from("receipts")
      .select("id")
      .eq("user_id", userId)
      .is("storage_path", null)
      .gt("amount_inc_vat", 20);

    // Check BTW aangifte status
    const now = new Date();
    const currentQuarter = Math.floor((now.getMonth() + 3) / 3);
    const { data: vatReturn } = await supabase
      .from("vat_returns")
      .select("status")
      .eq("user_id", userId)
      .eq("year", now.getFullYear())
      .eq("quarter", currentQuarter)
      .maybeSingle();

    // Check uren
    const { data: hours } = await supabase
      .from("hours_log")
      .select("duration_minutes")
      .eq("user_id", userId)
      .gte("date", `${now.getFullYear()}-01-01`);

    const totalMinutes = (hours || []).reduce((sum: number, h: { duration_minutes: number }) => sum + (h.duration_minutes || 0), 0);
    const totalHours = totalMinutes / 60;
    const targetHours = 1225;
    const hoursProgress = (totalHours / targetHours) * 100;

    // Bereken score
    let score = 100;
    const issues = [];

    if (missingReceipts && missingReceipts.length > 0) {
      score -= missingReceipts.length * 5;
      issues.push(`${missingReceipts.length} missende bonnetjes`);
    }

    if (!vatReturn || vatReturn.status === 'draft') {
      score -= 15;
      issues.push('BTW-aangifte niet ingediend');
    }

    if (totalHours < targetHours * 0.8) {
      score -= 10;
      issues.push('Urencriterium loopt achter');
    }

    score = Math.max(0, score);

    return {
      score,
      issues,
      lastChecked: new Date().toISOString(),
      vatDeadline: getVatDeadline(currentQuarter, now.getFullYear()),
      hoursProgress: {
        current: Math.round(totalHours),
        target: targetHours,
        percentage: Math.round(hoursProgress * 10) / 10
      }
    };
  } catch (error) {
    console.error('Compliance check error:', error);
    return { score: 0, issues: ['Compliance check mislukt'] };
  }
}

function getVatDeadline(quarter: number, year: number) {
  const deadlineMonths = [4, 7, 10, 1]; // April, July, October, January
  const deadlineMonth = deadlineMonths[quarter - 1];
  const deadlineYear = deadlineMonth === 1 ? year + 1 : year;
  const deadlineDate = new Date(deadlineYear, deadlineMonth, 0);
  return deadlineDate.toISOString().split('T')[0];
}

interface ComplianceStatus {
  score: number;
  issues: string[];
  lastChecked?: string;
  vatDeadline?: string;
  hoursProgress?: { current: number; target: number; percentage: number };
}

function formatTaxAdvice(projection: TaxProjection, compliance: ComplianceStatus | null, btwData: QuarterStats[] | null, _profile: Record<string, unknown> | null) {
  let advice = `📊 **Jouw Belastingberekening ${new Date().getFullYear()}**

💰 **Omzet & Winst**
- Bruto omzet: €${projection.brutoOmzet.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Kosten: €${projection.kosten.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Afschrijvingen: €${projection.afschrijvingen.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- **Bruto winst: €${projection.brutoWinst.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**

🧾 **Aftrekposten**
- Zelfstandigenaftrek: €${projection.zelfstandigenaftrek.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- MKB-vrijstelling: €${projection.mkbVrijstelling.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- KIA (investeringen): €${projection.kia.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Totaal geïnvesteerd: €${projection.totalInvestments.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

💸 **Belastingberekening**
- Belastbaar inkomen: €${projection.belastbaarInkomen.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Inkomstenbelasting: €${projection.inkomstenbelasting.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Algemene heffingskorting: €${projection.algemeneHeffingskorting.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Arbeidskorting: €${projection.arbeidskorting.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- **NETTO te betalen: €${projection.nettoIB.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**
- Effectief tarief: ${projection.effectiefTarief.toFixed(1)}%

📈 **Prognose volledig jaar**
- Verwachte omzet: €${projection.prognoseJaarOmzet.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Verwachte belasting: €${projection.prognoseJaarIB.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
`;

  // Voeg bespaartips toe
  if (projection.bespaartips && projection.bespaartips.length > 0) {
    advice += '\n💡 **Bespaartips**\n';
    projection.bespaartips.forEach((tip: Bespaartip) => {
      advice += `- ${tip.titel}: ${tip.beschrijving}\n`;
    });
    advice += '\n';
  }

  // Voeg BTW overzicht toe
  if (btwData && btwData.length > 0) {
    const latestQuarter = btwData[0];
    advice += `🧾 **BTW Overzicht**\n`;
    advice += `- Laatste kwartaal (${latestQuarter.quarter}): €${latestQuarter.netVat.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${latestQuarter.netVat >= 0 ? 'af te dragen' : 'terug te ontvangen'}\n\n`;
  }

  // Voeg compliance info toe
  if (compliance) {
    advice += `🔍 **Compliance Status**
- Score: ${compliance.score}/100
- Actuele issues: ${compliance.issues.length > 0 ? compliance.issues.join(', ') : 'Geen'}
- Urencriterium: ${compliance.hoursProgress?.current || 0}/${compliance.hoursProgress?.target || 1225} uur (${compliance.hoursProgress?.percentage || 0}%)
- Volgende BTW deadline: ${compliance.vatDeadline}

`;
  }

  // Voeg persoonlijke aanbevelingen toe
  advice += `🎯 **Persoonlijke Aanbevelingen**

Op basis van jouw situatie:

`;
  
  if (projection.nettoIB < projection.brutoOmzet * 0.1) {
    advice += `- ✅ Je belastingdruk is laag (${projection.effectiefTarief.toFixed(1)}%). Dit is een uitstekende uitgangspositie.\n`;
  }

  if (projection.totalInvestments < 2400) {
    advice += `- 💡 Overweeg te investeren in bedrijfsmiddelen. Met €${(2400 - projection.totalInvestments).toLocaleString('nl-NL')} extra investering bereik je de optimale KIA-regeling.\n`;
  }

  if (compliance?.hoursProgress && compliance.hoursProgress.percentage < 80) {
    advice += `- ⚠️ Let op je urencriterium. Je hebt nog ${compliance.hoursProgress.target - compliance.hoursProgress.current} uur nodig om de 1.225-uursnorm te halen.\n`;
  }

  if (compliance && compliance.issues && compliance.issues.length > 0) {
    advice += `- 📋 Los de compliance issues op: ${compliance.issues.join(', ')}.\n`;
  }

  advice += `
📞 **Volgende Stappen**
1. Controleer je administratie op missende bonnetjes
2. Plan je investeringen strategisch voor maximaal voordeel
3. Houd je uren bij voor het urencriterium
4. Dien je BTW-aangifte tijdig in

Heeft u specifieke vragen over een van deze onderwerpen?`;

  return advice;
}
