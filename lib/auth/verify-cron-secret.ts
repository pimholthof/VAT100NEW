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
  // Always compare using the same length to avoid leaking secret length
  const maxLength = Math.max(secret.length, expected.length);
  const secretBuffer = Buffer.alloc(maxLength, secret);
  const expectedBuffer = Buffer.alloc(maxLength, expected);

  return crypto.timingSafeEqual(secretBuffer, expectedBuffer);
}
