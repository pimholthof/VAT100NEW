"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { z } from "zod";

const feedbackSchema = z.object({
  category: z.enum(["bug", "suggestie", "vraag"]),
  message: z.string().min(5, "Feedback moet minimaal 5 tekens bevatten."),
  pageUrl: z.string(),
});

const npsSchema = z.object({
  score: z.number().int().min(0).max(10),
  reason: z.string().optional(),
});

export async function submitFeedback(formData: FormData): Promise<ActionResult> {
  const raw = {
    category: formData.get("category") as string,
    message: formData.get("message") as string,
    pageUrl: formData.get("pageUrl") as string,
  };

  const result = feedbackSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Validatiefout" };
  }

  const { category, message, pageUrl } = result.data;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Niet ingelogd." };
    }

    const { error: insertError } = await supabase.from("system_events").insert({
      event_type: "user.feedback",
      payload: {
        user_id: user.id,
        category,
        message,
        page_url: pageUrl,
        created_at: new Date().toISOString(),
      },
    });

    if (insertError) {
      console.error("[Feedback] Insert error:", insertError);
      return { error: "Er is een fout opgetreden. Probeer het opnieuw." };
    }

    return { error: null };
  } catch (err) {
    console.error("[Feedback] Unexpected error:", err);
    return { error: "Er is een fout opgetreden. Probeer het opnieuw." };
  }
}

export async function submitNps(score: number, reason?: string): Promise<ActionResult> {
  const result = npsSchema.safeParse({ score, reason });
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Validatiefout" };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Niet ingelogd." };
    }

    const { error: insertError } = await supabase.from("system_events").insert({
      event_type: "user.nps_score",
      payload: {
        user_id: user.id,
        score: result.data.score,
        reason: result.data.reason || null,
      },
    });

    if (insertError) {
      console.error("[NPS] Insert error:", insertError);
      return { error: "Er is een fout opgetreden. Probeer het opnieuw." };
    }

    return { error: null };
  } catch (err) {
    console.error("[NPS] Unexpected error:", err);
    return { error: "Er is een fout opgetreden. Probeer het opnieuw." };
  }
}
