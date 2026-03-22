/**
 * Simpele in-memory sliding window rate limiter.
 * Reset bij server restart — geschikt voor single-instance deployments.
 */
const hits = new Map<string, number[]>();

/**
 * Controleert of een request is toegestaan binnen de rate limit.
 * @returns true als toegestaan, false als geblokkeerd
 */
export function rateLimit(
  key: string,
  windowMs: number,
  maxHits: number
): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => t > now - windowMs);
  if (timestamps.length >= maxHits) return false;
  timestamps.push(now);
  hits.set(key, timestamps);
  return true;
}

/** Haal het IP-adres op uit een Request object */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
