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

  const secretBuffer = Buffer.from(secret, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  // timingSafeEqual throws on unequal length. Compare lengths first in a
  // way that still returns quickly for obvious mismatches — length is not
  // a real secret (the secret value is). After length match, compare bytes
  // in constant time.
  if (secretBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(secretBuffer, expectedBuffer);
}
