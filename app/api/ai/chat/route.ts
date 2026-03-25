import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Rate limiter per user ID (10 requests per minute)
// Note: in-memory — works per serverless instance. For distributed
// rate limiting, migrate to Redis or Supabase-based counter.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const MAX_QUERY_LENGTH = 2000;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// Prevent unbounded memory growth from rate limit map
function pruneRateLimitMap() {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Niet ingelogd." },
        { status: 401 }
      );
    }

    // 2. Rate limit per user (not IP — more reliable in serverless)
    if (isRateLimited(user.id)) {
      return NextResponse.json(
        { error: "Te veel verzoeken. Probeer het over een minuut opnieuw." },
        { status: 429 }
      );
    }

    // Periodic cleanup to prevent memory leak
    if (rateLimitMap.size > 1000) pruneRateLimitMap();

    // 3. Parse and validate input
    const body = await request.json();
    const query = typeof body?.query === "string" ? body.query.trim() : "";

    if (!query) {
      return NextResponse.json({ error: "Geen vraag gesteld." }, { status: 400 });
    }

    if (query.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `Vraag is te lang (max ${MAX_QUERY_LENGTH} tekens).` },
        { status: 400 }
      );
    }

    // 4. Fetch real user context for the AI
    const [
      { data: profile },
      { count: invoiceCount },
      { count: receiptCount },
      { data: openInvoices },
    ] = await Promise.all([
      supabase.from("profiles").select("full_name, studio_name").eq("id", user.id).single(),
      supabase.from("invoices").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("receipts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase
        .from("invoices")
        .select("total_inc_vat")
        .eq("user_id", user.id)
        .in("status", ["sent", "overdue"]),
    ]);

    const openAmount = (openInvoices ?? []).reduce(
      (sum, inv) => sum + (Number(inv.total_inc_vat) || 0), 0
    );
    const displayName = profile?.studio_name || profile?.full_name || "gebruiker";

    const contextStr = `
Gebruiker: ${displayName}
Totaal facturen: ${invoiceCount ?? 0}
Totaal bonnetjes: ${receiptCount ?? 0}
Openstaand bedrag: €${openAmount.toFixed(2)}`;

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
    Sentry.captureException(error, { tags: { route: "api/ai/chat" } });
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij de verwerking van je vraag." },
      { status: 500 }
    );
  }
}
