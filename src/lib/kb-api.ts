import { supabase } from "@/integrations/supabase/client";

export const KB_CATEGORIES = [
  "Calendários editoriais",
  "Estratégias",
  "Roteiros",
  "Briefings",
  "Campanhas",
  "Branding",
  "Copywriting",
  "Tráfego Pago",
  "Procedimentos da Kasa",
  "Templates",
] as const;

export type KbCategory = (typeof KB_CATEGORIES)[number];

export type KbDocument = {
  id: string;
  title: string;
  category: string;
  segment: string | null;
  client_id: string | null;
  tags: string[];
  description: string | null;
  content: string | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  source_type: string;
  source_ref: string | null;
  created_by: string;
  favorited_by: string[];
  created_at: string;
  updated_at: string;
};

export type KbFilter = {
  category?: string;
  segment?: string;
  client_id?: string;
  search?: string;
  favoritesOnly?: boolean;
  onlyMine?: boolean;
};

export async function listKbDocuments(filter: KbFilter = {}): Promise<KbDocument[]> {
  let q = supabase.from("kb_documents" as any).select("*").order("created_at", { ascending: false });
  if (filter.category) q = q.eq("category", filter.category);
  if (filter.segment) q = q.eq("segment", filter.segment);
  if (filter.client_id) q = q.eq("client_id", filter.client_id);
  if (filter.search) {
    q = q.or(
      `title.ilike.%${filter.search}%,description.ilike.%${filter.search}%,content.ilike.%${filter.search}%`,
    );
  }
  const { data, error } = await q;
  if (error) throw error;
  let rows = (data ?? []) as unknown as KbDocument[];

  if (filter.favoritesOnly || filter.onlyMine) {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (uid) {
      if (filter.favoritesOnly) rows = rows.filter((r) => r.favorited_by?.includes(uid));
      if (filter.onlyMine) rows = rows.filter((r) => r.created_by === uid);
    }
  }
  return rows;
}

export async function createKbDocument(input: {
  title: string;
  category: string;
  segment?: string | null;
  client_id?: string | null;
  tags?: string[];
  description?: string | null;
  content?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  source_type?: string;
  source_ref?: string | null;
}): Promise<KbDocument> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("kb_documents" as any)
    .insert({
      ...input,
      tags: input.tags ?? [],
      created_by: u.user.id,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as KbDocument;
}

export async function updateKbDocument(id: string, patch: Partial<KbDocument>) {
  const { data, error } = await supabase
    .from("kb_documents" as any)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as KbDocument;
}

export async function deleteKbDocument(id: string) {
  const { error } = await supabase.from("kb_documents" as any).delete().eq("id", id);
  if (error) throw error;
}

export async function toggleFavorite(doc: KbDocument): Promise<KbDocument> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Não autenticado");
  const uid = u.user.id;
  const has = doc.favorited_by?.includes(uid);
  const next = has ? doc.favorited_by.filter((x) => x !== uid) : [...(doc.favorited_by ?? []), uid];
  return updateKbDocument(doc.id, { favorited_by: next });
}

export async function uploadKbFile(file: File): Promise<{ path: string; name: string; type: string }> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Não autenticado");
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${u.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("kasa-knowledge").upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return { path, name: file.name, type: file.type };
}

export async function getKbFileUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("kasa-knowledge")
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
