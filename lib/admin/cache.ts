/**
 * Simple in-memory cache with TTL for serverless environments.
 * Falls back gracefully when cache misses occur across cold starts.
 */
const cache = new Map<string, { data: unknown; expires: number }>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      cache.delete(key);
    }
  }
}

// Predefined TTLs
export const CACHE_TTL = {
  DASHBOARD_KPIS: 5 * 60 * 1000,     // 5 minutes
  USER_LIST: 60 * 1000,               // 1 minute
  ANALYTICS: 15 * 60 * 1000,          // 15 minutes
  SYSTEM_STATUS: 30 * 1000,           // 30 seconds
  SETTINGS: 60 * 1000,                // 1 minute
} as const;
