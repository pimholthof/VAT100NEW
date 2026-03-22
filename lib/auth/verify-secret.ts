import { timingSafeEqual } from "crypto";

/**
 * Vergelijkt een Bearer-token uit de Authorization header met een secret
 * op een timing-safe manier om timing attacks te voorkomen.
 */
export function verifyBearerSecret(
  authHeader: string | null,
  secret: string | undefined
): boolean {
  if (!secret || !authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (token.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}
