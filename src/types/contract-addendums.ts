export type AddendumType =
  | "value_adjustment"
  | "scope_addition"
  | "scope_reduction"
  | "extension"
  | "mixed";

export interface ServiceAdjustment {
  service_id: string;
  name?: string;
  monthly_value: number;
}

export interface ContractAddendum {
  id: string;
  contract_id: string;
  client_id: string;
  addendum_number: number;
  title: string;
  type: AddendumType;
  effective_date: string;
  previous_monthly_value: number;
  new_monthly_value: number;
  one_time_value?: number;
  one_time_due_date?: string;
  services_to_add?: ServiceAdjustment[];
  services_to_remove?: string[]; // IDs de client_services
  notes?: string;
  terms_text?: string;
  status: "draft" | "applied";
  created_at: string;
  applied_at?: string;
  applied_by?: string;
}

export const ADDENDUM_TYPE_LABELS: Record<AddendumType, { label: string; description: string }> = {
  value_adjustment: {
    label: "Reajuste de Fee Mensal",
    description: "Alteração do valor mensal recorrente contratado.",
  },
  scope_addition: {
    label: "Acréscimo de Escopo",
    description: "Inclusão de novos serviços recorrentes ao contrato.",
  },
  scope_reduction: {
    label: "Supressão de Escopo",
    description: "Remoção ou redução de serviços contratados.",
  },
  extension: {
    label: "Prorrogação de Vigência",
    description: "Extensão de prazo ou renovação do contrato.",
  },
  mixed: {
    label: "Alteração Mista",
    description: "Combinação de reajuste de valor, serviços e taxas pontuais.",
  },
};
