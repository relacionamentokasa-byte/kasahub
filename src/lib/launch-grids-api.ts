import { supabase } from "@/integrations/supabase/client";

export type LaunchGrid = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  status: string;
  launch_date: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  clients?: { id: string; name: string | null; company: string | null } | null;
};

export type LaunchGridStatus = {
  id: string;
  grid_id: string;
  label: string;
  color: string;
  order_index: number;
  is_done: boolean;
};

export type LaunchGridSku = {
  id: string;
  name: string;
  done?: boolean;
  descricao?: string;
  cor_acabamento?: string;
  vol_ros?: string;
  custo_compras?: string;
  fornecedor?: string;
};

export type AspectoFisico =
  | "gel" | "fluido" | "creme" | "locao" | "solido"
  | "liquido" | "mousse" | "oleo" | "outros" | "";

export type Acondicionar = "selo" | "caixa" | "ambos" | "";

export type BoletimImagens = {
  tampa?: string[];
  embalagem?: string[];
  rotulo?: string[];
  outros?: string[];
};

export type LaunchGridBoletim = {
  categoria?: string;
  imagens?: BoletimImagens;
  briefing_criacao?: string;
  regulatorio_verso?: string;
  benchmark?: string[];
  volumetria?: string;
  aspecto_fisico?: AspectoFisico;
  acondicionar?: Acondicionar;
  descricao_embalagem?: string;
  responsaveis?: Array<{ nome: string; papel?: string }>;
};

export type LaunchGridProduct = {
  id: string;
  grid_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  status_id: string | null;
  due_date: string | null;
  responsible_id: string | null;
  links: Array<{ label: string; url: string }>;
  skus: LaunchGridSku[];
  notes: string | null;
  boletim: LaunchGridBoletim;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export async function listLaunchGrids() {
  const { data, error } = await supabase
    .from("launch_grids")
    .select("*, clients(id, name, company)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as LaunchGrid[];
}

export async function getLaunchGrid(id: string) {
  const { data, error } = await supabase
    .from("launch_grids")
    .select("*, clients(id, name, company)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as LaunchGrid | null;
}

// Retorna o grid do cliente. Cria automaticamente se ainda não existir.
export async function getOrCreateGridByClient(clientId: string, clientName?: string) {
  const { data: existing, error } = await supabase
    .from("launch_grids")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing as LaunchGrid;

  const { data: user } = await supabase.auth.getUser();
  const { data, error: createErr } = await supabase
    .from("launch_grids")
    .insert({
      client_id: clientId,
      title: `Grid de Lançamento — ${clientName ?? "Cliente"}`,
      owner_id: user.user?.id ?? null,
      created_by: user.user?.id ?? null,
    } as any)
    .select("*")
    .single();
  if (createErr) throw createErr;
  return data as LaunchGrid;
}

export async function listProductJobs(productId: string) {
  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, status, due_date, assignee_id, done_at, progress_percentage")
    .eq("launch_product_id", productId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

// Lista produtos do grid do cliente (sem criar grid se não existir)
export async function listProductsByClient(clientId: string): Promise<LaunchGridProduct[]> {
  const { data: grid, error } = await supabase
    .from("launch_grids")
    .select("id")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw error;
  if (!grid) return [];
  return listGridProducts(grid.id);
}

export async function listGridStatuses(gridId: string) {
  const { data, error } = await supabase
    .from("launch_grid_statuses")
    .select("*")
    .eq("grid_id", gridId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data || []) as LaunchGridStatus[];
}

export async function listGridProducts(gridId: string) {
  const { data, error } = await supabase
    .from("launch_grid_products")
    .select("*")
    .eq("grid_id", gridId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data || []).map((p: any) => ({
    ...p,
    links: Array.isArray(p.links) ? p.links : [],
    skus: Array.isArray(p.skus) ? p.skus : [],
  })) as LaunchGridProduct[];
}

export async function createLaunchGrid(input: {
  client_id: string;
  title: string;
  description?: string | null;
  launch_date?: string | null;
  cover_url?: string | null;
}) {
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("launch_grids")
    .insert({
      client_id: input.client_id,
      title: input.title,
      description: input.description ?? null,
      launch_date: input.launch_date ?? null,
      cover_url: input.cover_url ?? null,
      owner_id: user.user?.id ?? null,
      created_by: user.user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as LaunchGrid;
}

export async function updateLaunchGrid(id: string, patch: Partial<LaunchGrid>) {
  const { data, error } = await supabase
    .from("launch_grids")
    .update(patch as any)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as LaunchGrid;
}

export async function deleteLaunchGrid(id: string) {
  const { error } = await supabase.from("launch_grids").delete().eq("id", id);
  if (error) throw error;
}

export async function createProduct(input: {
  grid_id: string;
  name: string;
  status_id?: string | null;
  description?: string | null;
  image_url?: string | null;
  due_date?: string | null;
  responsible_id?: string | null;
  links?: Array<{ label: string; url: string }>;
  skus?: LaunchGridSku[];
  notes?: string | null;
}) {
  const { data: maxRow } = await supabase
    .from("launch_grid_products")
    .select("order_index")
    .eq("grid_id", input.grid_id)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextIdx = (maxRow?.order_index ?? -1) + 1;
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("launch_grid_products")
    .insert({
      grid_id: input.grid_id,
      name: input.name,
      status_id: input.status_id ?? null,
      description: input.description ?? null,
      image_url: input.image_url ?? null,
      due_date: input.due_date ?? null,
      responsible_id: input.responsible_id ?? null,
      links: (input.links ?? []) as any,
      skus: (input.skus ?? []) as any,
      notes: input.notes ?? null,
      order_index: nextIdx,
      created_by: user.user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return {
    ...(data as any),
    links: Array.isArray((data as any).links) ? (data as any).links : [],
    skus: Array.isArray((data as any).skus) ? (data as any).skus : [],
  } as LaunchGridProduct;
}

export async function updateProduct(id: string, patch: Partial<LaunchGridProduct>) {
  const payload: any = { ...patch };
  const { data, error } = await supabase
    .from("launch_grid_products")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return {
    ...(data as any),
    links: Array.isArray((data as any).links) ? (data as any).links : [],
    skus: Array.isArray((data as any).skus) ? (data as any).skus : [],
  } as LaunchGridProduct;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("launch_grid_products").delete().eq("id", id);
  if (error) throw error;
}

// Statuses CRUD
export async function createStatus(input: { grid_id: string; label: string; color?: string }) {
  const { data: maxRow } = await supabase
    .from("launch_grid_statuses")
    .select("order_index")
    .eq("grid_id", input.grid_id)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextIdx = (maxRow?.order_index ?? -1) + 1;
  const { data, error } = await supabase
    .from("launch_grid_statuses")
    .insert({
      grid_id: input.grid_id,
      label: input.label,
      color: input.color || "#94a3b8",
      order_index: nextIdx,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as LaunchGridStatus;
}

export async function updateStatus(id: string, patch: Partial<LaunchGridStatus>) {
  const { data, error } = await supabase
    .from("launch_grid_statuses")
    .update(patch as any)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as LaunchGridStatus;
}

export async function deleteStatus(id: string) {
  const { error } = await supabase.from("launch_grid_statuses").delete().eq("id", id);
  if (error) throw error;
}

// Upload de imagem do produto
export async function uploadProductImage(gridId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `launch-grids/${gridId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("public-assets")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (upErr) throw upErr;
  const { data } = supabase.storage.from("public-assets").getPublicUrl(path);
  return data.publicUrl;
}
