
import { supabase } from "@/integrations/supabase/client";

export const DUE_KIND_OPTIONS = [
  { value: "entrada", label: "Entrada" },
  { value: "7_dias", label: "7 dias" },
  { value: "15_dias", label: "15 dias" },
  { value: "30_dias", label: "30 dias" },
  { value: "45_dias", label: "45 dias" },
  { value: "60_dias", label: "60 dias" },
  { value: "custom", label: "Data específica" },
];

export interface PaymentInstallment {
  id: string;
  percent: number;
  due_kind: string;
  due_date?: string;
  value?: number;
}

export const DEFAULT_INSTALLMENTS: PaymentInstallment[] = [
  { id: "1", percent: 30, due_kind: "entrada" },
  { id: "2", percent: 70, due_kind: "30_dias" },
];

export const calculateInstallmentValues = (total: number, installments: PaymentInstallment[]) => {
  return installments.map(inst => ({
    ...inst,
    value: (total * inst.percent) / 100
  }));
};
