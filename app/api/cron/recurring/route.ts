import { NextRequest, NextResponse } from "next/server";
import { processRecurringInvoices } from "@/lib/actions/recurring";
import { verifyBearerSecret } from "@/lib/auth/verify-secret";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`cron-recurring:${ip}`, 60_000, 30)) {
    return NextResponse.json({ error: "Te veel verzoeken" }, { status: 429 });
  }

  const authHeader = request.headers.get("authorization");
  if (!verifyBearerSecret(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const result = await processRecurringInvoices();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    created: result.data?.created ?? 0,
  });
}
