import { createServiceClient } from "@/lib/supabase/service";

const settingsCache = new Map<string, { value: unknown; expires: number }>();
const CACHE_TTL = 60_000; // 1 minute

export async function getSetting<T = unknown>(key: string, fallback?: T): Promise<T> {
  // Check cache first
  const cached = settingsCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.value as T;
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", key)
      .single();

    if (error || !data) return fallback as T;

    const value = data.value as T;
    settingsCache.set(key, { value, expires: Date.now() + CACHE_TTL });
    return value;
  } catch {
    return fallback as T;
  }
}

export function invalidateSettingsCache(key?: string): void {
  if (key) {
    settingsCache.delete(key);
  } else {
    settingsCache.clear();
  }
}
