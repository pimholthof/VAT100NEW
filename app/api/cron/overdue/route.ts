import { NextRequest, NextResponse } from "next/server";
import { processOverdueInvoices } from "@/lib/actions/invoices";
import { verifyBearerSecret } from "@/lib/auth/verify-secret";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Cron: Overdue Invoice Handler (daily 06:00)
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`cron-overdue:${ip}`, 60_000, 30)) {
    return NextResponse.json({ error: "Te veel verzoeken" }, { status: 429 });
  }

  const authHeader = request.headers.get("authorization");
  if (!verifyBearerSecret(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processOverdueInvoices();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result.data);
}
