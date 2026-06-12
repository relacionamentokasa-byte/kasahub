import { supabase } from "@/integrations/supabase/client";

export type ContaBancaria = {
  id: string;
  nome: string;
  saldo_inicial: number;
  created_at: string;
  updated_at: string;
};

const TABLE = "contas_bancarias" as const;

export async function fetchContasBancarias(): Promise<ContaBancaria[]> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data || []) as ContaBancaria[];
}

export async function createContaBancaria(input: { nome: string; saldo_inicial: number }) {
  const { data: userData } = await supabase.auth.getUser();
  const payload = { ...input, owner_id: userData.user?.id ?? null };
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as ContaBancaria;
}

export async function deleteContaBancaria(id: string) {
  // Bloqueia exclusão se houver transações vinculadas
  const { count, error: countError } = await (supabase as any)
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("conta_id", id);
  if (countError) throw countError;
  if ((count ?? 0) > 0) {
    throw new Error("Não é possível excluir: existem lançamentos vinculados a esta conta.");
  }
  const { error } = await (supabase as any).from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
