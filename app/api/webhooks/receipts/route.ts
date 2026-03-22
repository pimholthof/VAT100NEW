import { NextResponse } from "next/server";
import { processReceiptWebhook } from "@/lib/actions/receipts";
import { verifyBearerSecret } from "@/lib/auth/verify-secret";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Agent 1: Receipt Catcher (Webhook Endpoint)
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!rateLimit(`webhook-receipts:${ip}`, 60_000, 30)) {
    return NextResponse.json({ error: "Te veel verzoeken" }, { status: 429 });
  }

  const authHeader = request.headers.get("authorization");
  if (!verifyBearerSecret(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.json();
    
    if (!payload.userId || (!payload.amount && payload.amount !== 0)) {
      return NextResponse.json(
        { error: "userId and amount are required" },
        { status: 400 }
      );
    }

    const result = await processReceiptWebhook(payload);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
