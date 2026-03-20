"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, Document } from "@/lib/types";
import { documentSchema, validate } from "@/lib/validation";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
  "text/csv",
];

export async function getDocuments(filters?: {
  client_id?: string;
  invoice_id?: string;
}): Promise<ActionResult<Document[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  let query = supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters?.client_id) {
    query = query.eq("client_id", filters.client_id);
  }
  if (filters?.invoice_id) {
    query = query.eq("invoice_id", filters.invoice_id);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { error: null, data: (data ?? []) as Document[] };
}

export async function uploadDocument(
  formData: FormData
): Promise<ActionResult<Document>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const file = formData.get("file") as File | null;
  if (!file) return { error: "Geen bestand geselecteerd." };

  if (file.size > MAX_FILE_SIZE) {
    return { error: "Bestand is te groot (max 25MB)." };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Bestandstype niet toegestaan." };
  }

  const meta = {
    name: formData.get("name") as string || file.name,
    client_id: (formData.get("client_id") as string) || null,
    invoice_id: (formData.get("invoice_id") as string) || null,
    notes: (formData.get("notes") as string) || null,
  };

  const parsed = validate(documentSchema, meta);
  if (parsed.error) return { error: parsed.error };

  // Upload file to storage
  const ext = file.name.split(".").pop() ?? "bin";
  const storagePath = `user-documents/${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) return { error: `Upload mislukt: ${uploadError.message}` };

  // Insert database record
  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      name: parsed.data!.name,
      storage_path: storagePath,
      file_type: file.type,
      file_size: file.size,
      client_id: parsed.data!.client_id ?? null,
      invoice_id: parsed.data!.invoice_id ?? null,
      notes: parsed.data!.notes ?? null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data: data as Document };
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  // Get storage path first
  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!doc) return { error: "Document niet gevonden." };

  // Delete from storage
  await supabase.storage
    .from("documents")
    .remove([doc.storage_path]);

  // Delete database record
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function getDocumentUrl(id: string): Promise<ActionResult<string>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!doc) return { error: "Document niet gevonden." };

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.storage_path, 3600);

  if (error || !data?.signedUrl) {
    return { error: "Kon download-link niet aanmaken." };
  }

  return { error: null, data: data.signedUrl };
}
