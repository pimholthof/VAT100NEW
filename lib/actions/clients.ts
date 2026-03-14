"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Client, ClientInput } from "@/lib/types";

export async function getClients(): Promise<ActionResult<Client[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) return { error: error.message };
  return { error: null, data: data ?? [] };
}

export async function createQuickClient(
  input: ClientInput
): Promise<ActionResult<Client>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Niet ingelogd." };

  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: user.id,
      name: input.name,
      contact_name: input.contact_name,
      email: input.email,
      address: input.address,
      city: input.city,
      postal_code: input.postal_code,
      kvk_number: input.kvk_number,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data };
}
