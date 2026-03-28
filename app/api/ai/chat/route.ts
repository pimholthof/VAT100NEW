import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { CFO_TOOLS } from "@/lib/ai/tools";
import { handleToolCall } from "@/lib/ai/tool-handlers";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Maximum tool-use iterations to prevent infinite loops
const MAX_TOOL_ITERATIONS = 5;


export async function POST(request: NextRequest) {
  try {
    // Authenticate user — prevents unauthorized API usage
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Niet ingelogd." },
        { status: 401 }
      );
    }

    // Feature-gate: AI chat is Compleet-only
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_id, status")
      .eq("user_id", user.id)
      .in("status", ["active", "past_due"])
      .single();

    if (!subscription || subscription.plan_id !== "compleet") {
      return NextResponse.json(
        { error: "Upgrade naar Compleet om de AI boekhouder te gebruiken." },
        { status: 403 }
      );
    }

    // Rate limit per user (not IP — works across serverless instances)
    const limited = await isRateLimited(`ai-chat:${user.id}`);
    if (limited) {
      return NextResponse.json(
        { error: "Te veel verzoeken. Probeer het over een minuut opnieuw." },
        { status: 429 }
      );
    }

    const { query, history } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Geen vraag gesteld" }, { status: 400 });
    }


    // Fetch user profile for context
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, studio_name, kvk_number, btw_number")
      .eq("id", user.id)
      .single();

    const today = new Date().toISOString().split("T")[0];
    const currentQ = Math.floor(new Date().getMonth() / 3) + 1;

    const systemPrompt = `Je bent de VAT100 Autonome CFO Assistent${profile?.studio_name ? ` voor ${profile.studio_name}` : ""}.
Je helpt zzp'ers en freelancers met inzicht in hun cashflow, facturen, bonnetjes en belastingen.

Bedrijfsgegevens:
- Eigenaar: ${profile?.full_name ?? "onbekend"}
- Studio: ${profile?.studio_name ?? "onbekend"}
- KVK: ${profile?.kvk_number ?? "niet ingesteld"}
- BTW-nummer: ${profile?.btw_number ?? "niet ingesteld"}
- Vandaag: ${today}
- Huidig kwartaal: Q${currentQ} ${new Date().getFullYear()}

Instructies:
- Gebruik de beschikbare tools om data op te zoeken voordat je antwoord geeft. Geef GEEN fictieve data.
- Als je niet genoeg informatie hebt, gebruik dan een tool om het op te zoeken.
- Antwoord altijd in het Nederlands.
- Houd je antwoorden professioneel, beknopt en to-the-point.
- Gebruik valutanotatie met €-teken (bijv. €1.234,56).
- Bij bedragen: rond af op 2 decimalen.
- Vermijd markdown formatting tenzij nodig (zoals opsommingen of vetgedrukt).`;

    // Build messages: include history for multi-turn, then add new query
    const messages: Anthropic.MessageParam[] = [];

    if (Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role === "user") {
          messages.push({ role: "user", content: msg.content });
        } else if (msg.role === "ai") {
          messages.push({ role: "assistant", content: msg.content });
        }
      }
    }

    messages.push({ role: "user", content: query });

    // Tool-use loop: Claude may request multiple tools before giving a final answer
    let iterations = 0;
    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      tools: CFO_TOOLS,
      messages,
    });

    while (response.stop_reason === "tool_use" && iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      // Add assistant response (with tool_use blocks) to messages
      messages.push({ role: "assistant", content: response.content });

      // Process all tool calls in this response
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await handleToolCall(
            block.name,
            block.input as Record<string, unknown>,
            user.id,
            supabase
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      // Add tool results as user message
      messages.push({ role: "user", content: toolResults });

      // Get next response from Claude
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: systemPrompt,
        tools: CFO_TOOLS,
        messages,
      });
    }

    // Extract final text response
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
