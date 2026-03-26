import { getRequiredEnv } from "@/lib/utils/env";
import crypto from "crypto";

/**
 * Timing-safe verification of cron/webhook bearer tokens.
 * Prevents timing attacks that could leak secret characters.
 */
export function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  const secret = cronHeader || authHeader?.replace("Bearer ", "");

  if (!secret) return false;

  const expected = getRequiredEnv("CRON_SECRET");

  // Use timing-safe comparison to prevent timing attacks
  const secretBuffer = Buffer.from(secret);
  const expectedBuffer = Buffer.from(expected);

  if (secretBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(secretBuffer, expectedBuffer);
}
