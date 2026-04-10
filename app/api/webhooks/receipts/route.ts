import { NextResponse } from "next/server";
import { processReceiptWebhook } from "@/features/receipts/actions";
import { verifyCronSecret } from "@/lib/auth/verify-cron-secret";
import { getErrorMessage } from "@/lib/utils/errors";

/**
 * Agent 1: Receipt Catcher (Webhook Endpoint)
 */
export async function POST(request: Request) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      { error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
