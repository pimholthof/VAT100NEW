import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/server';
import { calculateZZPTaxProjection } from '@/lib/tax/dutch-tax-2026';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error !== null) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const { testScenario } = body;

    // Test scenarios voor de VAT100 Tax Agent
    const scenarios = {
      zzp_65000: {
        description: "ZZP'er met €65.000 omzet",
        input: {
          jaarOmzetExBtw: 65000,
          jaarKostenExBtw: 19500, // 30% kosten
          investeringen: [
            {
              id: "1",
              omschrijving: "Laptop",
              aanschafprijs: 1200,
              aanschafDatum: "2024-01-15",
              levensduur: 5,
              restwaarde: 0
            }
          ],
          maandenVerstreken: 12,
          kilometerAftrek: 0
        }
      },
      starter_25000: {
        description: "Startende ZZP'er met €25.000 omzet",
        input: {
          jaarOmzetExBtw: 25000,
          jaarKostenExBtw: 5000, // 20% kosten
          investeringen: [],
          maandenVerstreken: 8,
          kilometerAftrek: 800
        }
      },
      high_earner_120000: {
        description: "Hoge inkomsten ZZP'er met €120.000 omzet",
        input: {
          jaarOmzetExBtw: 120000,
          jaarKostenExBtw: 36000, // 30% kosten
          investeringen: [
            {
              id: "1",
              omschrijving: "Auto",
              aanschafprijs: 25000,
              aanschafDatum: "2024-01-01",
              levensduur: 5,
              restwaarde: 0
            },
            {
              id: "2",
              omschrijving: "Kantoormeubilair",
              aanschafprijs: 5000,
              aanschafDatum: "2024-06-01",
              levensduur: 5,
              restwaarde: 0
            }
          ],
          maandenVerstreken: 12,
          kilometerAftrek: 0
        }
      }
    };

    const scenario = scenarios[testScenario as keyof typeof scenarios];
    if (!scenario) {
      return NextResponse.json({ error: "Invalid test scenario" }, { status: 400 });
    }

    // Voer berekening uit
    const projection = calculateZZPTaxProjection(scenario.input);

    // Simuleer API response
    const response = {
      scenario: scenario.description,
      input: scenario.input,
      projection,
      timestamp: new Date().toISOString(),
      success: true
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Tax Agent Test Error:', error);
    return NextResponse.json(
      { error: 'Er is een fout opgetreden bij de test.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return beschikbare test scenarios
  const scenarios = {
    zzp_65000: "ZZP'er met €65.000 omzet",
    starter_25000: "Startende ZZP'er met €25.000 omzet", 
    high_earner_120000: "Hoge inkomsten ZZP'er met €120.000 omzet"
  };

  return NextResponse.json({
    scenarios,
    usage: "POST met { testScenario: 'scenario_key' } om een test uit te voeren"
  });
}
