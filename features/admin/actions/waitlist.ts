"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";
import { sanitizeError } from "@/lib/errors";


// ─── Waitlist ───

export interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  referral: string | null;
  created_at: string;
}

export async function getWaitlist(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{ entries: WaitlistEntry[]; total: number }>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("waitlist")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      query = query.or(`email.ilike.${term},name.ilike.${term}`);
    }

    const { data, count, error } = await query;

    if (error) return { error: sanitizeError(error, { action: "getWaitlist" }) };

    return {
      error: null,
      data: {
        entries: (data ?? []) as WaitlistEntry[],
        total: count ?? 0,
      },
    };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getWaitlist" }) };
  }
}

export async function getWaitlistCount(): Promise<ActionResult<number>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();
    const { count, error } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    if (error) return { error: sanitizeError(error, { action: "getWaitlistCount" }) };
    return { error: null, data: count ?? 0 };
  } catch (e) {
    return { error: sanitizeError(e, { action: "getWaitlistCount" }) };
  }
}
