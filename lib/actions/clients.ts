"use server";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult, Client, ClientInput } from "@/lib/types";
import { clientSchema, validate } from "@/lib/validation";

export async function getClients(search?: string): Promise<ActionResult<Client[]>> {
  const supabase = await createSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) return { error: "Niet ingelogd." };

  let query = supabase
    .from("clients")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`name.ilike.${term},contact_name.ilike.${term},email.ilike.${term}`);
  }

  const { data, error } = await query;

  if (error) return { error: error.message };
  return { error: null, data: data ?? [] };
}

export async function getClient(
  id: string
): Promise<ActionResult<Client>> {
  const supabase = await createSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) return { error: "Niet ingelogd." };

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return { error: error.message };
  if (!data) return { error: "Klant niet gevonden." };
  return { error: null, data };
}

export async function createNewClient(
  input: ClientInput
): Promise<ActionResult<Client>> {
  const supabase = await createSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) return { error: "Niet ingelogd." };

  const v = validate(clientSchema, input);
  if (v.error) return { error: v.error };

  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: user.id,
      name: input.name.trim(),
      contact_name: input.contact_name?.trim() || null,
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      postal_code: input.postal_code?.trim() || null,
      kvk_number: input.kvk_number?.trim() || null,
      btw_number: input.btw_number?.trim() || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data };
}

export async function updateClient(
  id: string,
  input: ClientInput
): Promise<ActionResult<Client>> {
  const supabase = await createSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) return { error: "Niet ingelogd." };

  const v = validate(clientSchema, input);
  if (v.error) return { error: v.error };

  const { data, error } = await supabase
    .from("clients")
    .update({
      name: input.name.trim(),
      contact_name: input.contact_name?.trim() || null,
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      postal_code: input.postal_code?.trim() || null,
      kvk_number: input.kvk_number?.trim() || null,
      btw_number: input.btw_number?.trim() || null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data };
}

export async function deleteClient(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) return { error: "Niet ingelogd." };

  // Check if client has invoices
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("client_id", id)
    .eq("user_id", user.id);

  if (count && count > 0) {
    return { error: "Klant kan niet worden verwijderd omdat er facturen aan gekoppeld zijn." };
  }

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function getClientStats(
  clientId: string
): Promise<
  ActionResult<{
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
  }>
> {
  const supabase = await createSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) return { error: "Niet ingelogd." };

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("total_inc_vat, status")
    .eq("client_id", clientId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;

  for (const inv of invoices ?? []) {
    totalInvoiced += inv.total_inc_vat;
    if (inv.status === "paid") {
      totalPaid += inv.total_inc_vat;
    }
    if (inv.status === "sent" || inv.status === "overdue") {
      totalOutstanding += inv.total_inc_vat;
    }
  }

  return {
    error: null,
    data: {
      totalInvoiced: Math.round(totalInvoiced * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    },
  };
}

export async function getClientInvoices(
  clientId: string
): Promise<ActionResult<Array<{
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  total_inc_vat: number;
}>>> {
  const supabase = await createSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) return { error: "Niet ingelogd." };

  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, issue_date, total_inc_vat")
    .eq("client_id", clientId)
    .eq("user_id", user.id)
    .order("issue_date", { ascending: false });

  if (error) return { error: error.message };
  return { error: null, data: data ?? [] };
}
