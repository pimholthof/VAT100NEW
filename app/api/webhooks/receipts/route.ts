import { NextResponse } from "next/server";
import { processReceiptWebhook } from "@/features/receipts/actions";

/**
 * Agent 1: Receipt Catcher (Webhook Endpoint)
 * Secured via WEBHOOK_SECRET header validation.
 */
export async function POST(request: Request) {
  try {
    // Validate webhook secret
    const secret = request.headers.get("x-webhook-secret");
    if (!process.env.WEBHOOK_SECRET || secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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
