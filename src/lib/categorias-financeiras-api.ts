import { supabase } from "@/integrations/supabase/client";

export type CategoriaTipo = "Receita" | "Despesa";

export interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: CategoriaTipo;
}

export async function fetchCategoriasFinanceiras(): Promise<CategoriaFinanceira[]> {
  const { data, error } = await supabase
    .from("categorias_financeiras" as any)
    .select("id, nome, tipo")
    .order("tipo", { ascending: true })
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as CategoriaFinanceira[];
}

export async function createCategoriaFinanceira(nome: string, tipo: CategoriaTipo) {
  const { data, error } = await supabase
    .from("categorias_financeiras" as any)
    .insert({ nome: nome.trim(), tipo })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategoriaFinanceira(id: string) {
  const { error } = await supabase
    .from("categorias_financeiras" as any)
    .delete()
    .eq("id", id);
  if (error) throw error;
}
