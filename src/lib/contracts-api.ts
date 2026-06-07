import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ContractTemplate = Database["public"]["Tables"]["contract_templates"]["Row"];

export async function fetchContractTemplates(): Promise<ContractTemplate[]> {
  const { data, error } = await supabase
    .from("contract_templates")
    .select("*")
    .is("archived_at", null)
    .order("title");
  if (error) throw error;
  return data ?? [];
}

export async function createContractTemplate(input: {
  title: string;
  content: string;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("contract_templates")
    .insert({ ...input, owner_id: userData.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateContractTemplate(
  id: string,
  patch: Partial<Database["public"]["Tables"]["contract_templates"]["Update"]>,
) {
  const { data, error } = await supabase
    .from("contract_templates")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteContractTemplate(id: string) {
  const { error } = await supabase
    .from("contract_templates")
    .update({ archived_at: new Date().toISOString(), is_active: false })
    .eq("id", id);
  if (error) throw error;
}

export function replaceContractVariables(
  content: string,
  data: {
    client_name?: string;
    client_legal_name?: string;
    client_document?: string;
    client_address?: string;
    client_email?: string;
    client_phone?: string;
    services_list?: string;
    monthly_value?: string;
    setup_value?: string;
    total_value?: string;
    payment_method?: string;
    contract_term?: string;
    start_date?: string;
    due_day?: string;
    installments?: string;
  }
) {
  let result = content;
  const vars = {
    "{{cliente}}": data.client_name || "",
    "{{razao_social}}": data.client_legal_name || data.client_name || "",
    "{{cnpj}}": data.client_document || "",
    "{{endereco}}": data.client_address || "",
    "{{email}}": data.client_email || "",
    "{{telefone}}": data.client_phone || "",
    "{{servicos}}": data.services_list || "",
    "{{valor_mensal}}": data.monthly_value || "",
    "{{valor_total}}": data.total_value || "",
    "{{forma_pagamento}}": data.payment_method || "",
    "{{prazo}}": data.contract_term || "",
    "{{data_inicio}}": data.start_date || "",
    "{{dia_vencimento}}": data.due_day || "",
    "{{parcelas}}": data.installments || "",
  };

  Object.entries(vars).forEach(([key, value]) => {
    result = result.split(key).join(value);
  });

  return result;
}
