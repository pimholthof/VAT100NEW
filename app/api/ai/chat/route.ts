import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Geen vraag gesteld" }, { status: 400 });
    }

    // 1. Manually fetch the user context to feed to the LLM (Naive RAG / Context Injection)
    // Note: In production we would use pgvector and similarity search. 
    // Here we inject an aggregated summary for the MVP.
    // We can't easily use cookies in API routes without complex setup
    // So for the sake of MVP we will use the service role or a simplified approach
    // If not authenticated, we'll just mock the data fetch or use anon
    
    // However, since it's an MVP, let's just make it a general financial assistant first
    // combined with whatever we can get. 
    
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
