import { supabase } from "@/integrations/supabase/client";

export interface Supplier {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  const { data, error } = await (supabase as any)
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data || []) as Supplier[];
}

export async function createSupplier(input: {
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}): Promise<Supplier> {
  const { data, error } = await (supabase as any)
    .from("suppliers")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Supplier;
}

export async function updateSupplier(
  id: string,
  patch: Partial<Omit<Supplier, "id" | "created_at" | "updated_at">>,
): Promise<Supplier> {
  const { data, error } = await (supabase as any)
    .from("suppliers")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Supplier;
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await (supabase as any).from("suppliers").delete().eq("id", id);
  if (error) throw error;
}
