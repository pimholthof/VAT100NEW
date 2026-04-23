"use server";

import Anthropic from "@anthropic-ai/sdk";
import { modelFor } from "./models";
import { consumeAiQuota } from "./quota";
import { requirePlan } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatInvokeInput {
  systemPrompt: string;
  messages: ChatMessage[];
  maxTokens?: number;
}

export interface ChatResponse {
  text: string;
  remainingQuota: number | null;
}

/**
 * Centrale Claude chat-aanroep voor de "slimme boekhouder"-functie.
 *
 * Alles hier gecentraliseerd zodat nieuwe chat-endpoints automatisch
 * profiteren van:
 *   - Plan-gate (Complete of hoger)
 *   - Quota-consumptie (marge-bescherming bij power-users)
 *   - Prompt caching op de systeemprompt (~90% korting op input)
 *   - Model-routing: Opus voor chat, NIET Sonnet
 *
 * Nieuwe UI-features hoeven alleen deze functie aan te roepen — niet direct
 * de Anthropic-client.
 */
export async function invokeChat(
  input: ChatInvokeInput,
): Promise<ActionResult<ChatResponse>> {
  const planCheck = await requirePlan("compleet");
  if (planCheck.error !== null) return { error: planCheck.error };

  const quotaCheck = await consumeAiQuota(planCheck.user.id, "chat");
  if (quotaCheck.error !== null) return { error: quotaCheck.error };

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await anthropic.messages.create({
      model: modelFor("CHAT"),
      max_tokens: input.maxTokens ?? 1024,
      system: [
        {
          type: "text",
          text: input.systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: input.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textBlock = response.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { error: "Geen antwoord ontvangen van Claude." };
    }

    return {
      error: null,
      data: {
        text: textBlock.text,
        remainingQuota: quotaCheck.data?.remaining ?? null,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI-fout onbekend";
    return { error: `Kon chat-antwoord niet ophalen: ${message}` };
  }
}
