import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MAX_QUERY_LENGTH = 2000;

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
    }

    const { query } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Geen vraag gesteld." }, { status: 400 });
    }

    if (query.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `Vraag is te lang (max ${MAX_QUERY_LENGTH} tekens).` },
        { status: 400 }
      );
    }

    // For now, we simulate pulling the current context
    const contextStr = `
(Let op: dit is momenteel een demo-omgeving. Je antwoordt als VAT100 AI Assistant.
Je bent een slimme, proactieve CFO / boekhoud-assistent.
Geef korte, bondige, en behulpzame antwoorden in het Nederlands.
Je kunt uitleggen wat er allemaal mogelijk is wegens de "Liquid" architectuur.)
`;

    const systemPrompt = `Je bent de VAT100 Autonome CFO Assistent.
Je helpt zzp'ers en freelancers met inzicht in hun cashflow, facturen en bonnetjes.
Houd je antwoorden professioneel, zeer beknopt, to-the-point en behulpzaam. Vermijd markdown formatting tenzij nodig (zoals opsommingen of vetgedrukt).
Context van de gebruiker:\n${contextStr}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: query,
        }
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");

    return NextResponse.json({
      text: textContent?.type === "text" ? textContent.text : "Ik kon helaas geen antwoord formuleren."
    });

  } catch (error) {
    console.error("Error in AI Chat:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij de verwerking van je vraag." },
      { status: 500 }
    );
  }
}
