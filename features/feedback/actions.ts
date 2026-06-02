"use server";

import { requireAuth } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { headers } from "next/headers";
import type { ActionResult } from "@/lib/types";

export type FeedbackSentiment = "positive" | "neutral" | "negative";

export interface SubmitFeedbackInput {
  message: string;
  sentiment?: FeedbackSentiment | null;
  pageUrl?: string | null;
}

/**
 * Sla feedback van een ingelogde gebruiker op. Bewust kort: één bericht,
 * optioneel een gevoel, plus de pagina waar het vandaan komt. RLS borgt dat
 * een gebruiker alleen eigen feedback kan insturen/teruglezen.
 */
export async function submitFeedback(
  input: SubmitFeedbackInput,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const message = input.message?.trim() ?? "";
  if (message.length < 2) return { error: "Schrijf even kort wat je kwijt wilt." };
  if (message.length > 4000) return { error: "Feedback is te lang (max. 4000 tekens)." };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (await isRateLimited(`feedback:${user.id}:${ip}`, 20, 60_000)) {
    return { error: "Te veel feedback in korte tijd. Probeer het zo opnieuw." };
  }

  const sentiment: FeedbackSentiment | null = input.sentiment ?? null;
  const pageUrl = input.pageUrl?.slice(0, 500) ?? null;
  const userAgent = h.get("user-agent")?.slice(0, 500) ?? null;

  const { data, error } = await supabase
    .from("feedback")
    .insert({
      user_id: user.id,
      message,
      sentiment,
      page_url: pageUrl,
      user_agent: userAgent,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Kon feedback niet opslaan. Probeer het opnieuw." };
  return { error: null, data: { id: data.id as string } };
}
