import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { getRequiredEnv } from "@/lib/utils/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;
type AuthResult = { error: null; supabase: SupabaseServer; user: User } | { error: string; supabase: null; user: null };

/**
 * Authenticates the current user. Returns the Supabase client and user,
 * or an error string if not logged in.
 *
 * Usage:
 *   const auth = await requireAuth();
 *   if (auth.error) return { error: auth.error };
 *   const { supabase, user } = auth;
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return { error: "Niet ingelogd.", supabase: null, user: null };
  return { error: null, supabase, user };
}
