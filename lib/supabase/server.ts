import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { sanitizeSupabaseError } from "@/lib/errors";
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

/**
 * Checks if the current user has a specific plan (or higher).
 * Returns the subscription or an error if the user's plan doesn't match.
 */
type PlanResult =
  | { error: null; planId: string; status: 200; supabase: SupabaseServer; user: User }
  | { error: string; planId: null; status: 401 | 403 | 500; supabase: null; user: null };

const planHierarchy = {
  basis: 0,
  basis_yearly: 0,
  studio: 1,
  studio_yearly: 1,
  compleet: 2,
  compleet_yearly: 2,
  plus: 3,
  plus_yearly: 3,
} as const;

type RequiredPlanId = keyof typeof planHierarchy;

export async function requirePlan(
  requiredPlanId: RequiredPlanId,
): Promise<PlanResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error, planId: null, status: 401, supabase: null, user: null };

  const { data: subscription, error: subscriptionError } = await auth.supabase
    .from("subscriptions")
    .select("plan_id, status")
    .eq("user_id", auth.user.id)
    .in("status", ["active", "past_due"])
    .single();

  if (subscriptionError) {
    if (subscriptionError.code === "PGRST116") {
      return { error: "Geen actief abonnement.", planId: null, status: 403, supabase: null, user: null };
    }

    return {
      error: sanitizeSupabaseError(subscriptionError, {
        area: "requirePlan",
        requiredPlanId,
        userId: auth.user.id,
      }),
      planId: null,
      status: 500,
      supabase: null,
      user: null,
    };
  }

  if (!subscription) {
    return { error: "Geen actief abonnement.", planId: null, status: 403, supabase: null, user: null };
  }

  const requiredRank = planHierarchy[requiredPlanId];
  const currentRank = planHierarchy[subscription.plan_id as RequiredPlanId];

  if (currentRank === undefined) {
    return { error: "Onbekend abonnement.", planId: null, status: 403, supabase: null, user: null };
  }

  if (currentRank < requiredRank) {
    const upgradeLabel =
      requiredPlanId === "basis" || requiredPlanId === "basis_yearly"
        ? "Start"
        : requiredPlanId === "studio" || requiredPlanId === "studio_yearly"
          ? "Studio"
          : requiredPlanId === "compleet" || requiredPlanId === "compleet_yearly"
            ? "Complete"
            : "Plus";
    return { error: `Upgrade naar ${upgradeLabel} om deze functie te gebruiken.`, planId: null, status: 403, supabase: null, user: null };
  }

  return { error: null, planId: subscription.plan_id, status: 200, supabase: auth.supabase, user: auth.user };
}

type AdminResult =
  | { error: null; status: 200; supabase: SupabaseServer; user: User }
  | { error: string; status: 401 | 403 | 500; supabase: null; user: null };

/**
 * Authenticates the current user AND verifies admin role.
 * Returns error if not logged in or not an admin.
 */
export async function requireAdmin(): Promise<AdminResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error, status: 401, supabase: null, user: null };

  const { data: profile, error: profileError } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (profileError) {
    if (profileError.code === "PGRST116") {
      return { error: "Geen toegang.", status: 403, supabase: null, user: null };
    }

    return {
      error: sanitizeSupabaseError(profileError, {
        area: "requireAdmin",
        userId: auth.user.id,
      }),
      status: 500,
      supabase: null,
      user: null,
    };
  }

  if (!profile || profile.role !== "admin") {
    return { error: "Geen toegang.", status: 403, supabase: null, user: null };
  }

  return { error: null, status: 200, supabase: auth.supabase, user: auth.user };
}
