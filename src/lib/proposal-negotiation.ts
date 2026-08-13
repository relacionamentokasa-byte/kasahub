
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

/**
 * Distributes value equally across N installments, with rounding correction in the last one.
 */
export const distributeEqually = (total: number, count: number): PaymentInstallment[] => {
  if (count <= 1) return [{ id: "1", percent: 100, due_kind: "entrada" }];
  
  const percentPerInstallment = Math.floor((100 / count) * 100) / 100;
  const installments: PaymentInstallment[] = [];
  
  let currentSum = 0;
  for (let i = 1; i < count; i++) {
    installments.push({
      id: String(i),
      percent: percentPerInstallment,
      due_kind: i === 1 ? "entrada" : `${(i - 1) * 30}_dias`
    });
    currentSum += percentPerInstallment;
  }
  
  // Last installment gets the remainder to sum exactly 100%
  const remainder = Math.round((100 - currentSum) * 100) / 100;
  installments.push({
    id: String(count),
    percent: remainder,
    due_kind: `${(count - 1) * 30}_dias`
  });
  
  return installments;
};

export const calculateInstallmentValues = (total: number, installments: PaymentInstallment[]) => {
  let distributedTotal = 0;
  const results = installments.map((inst, idx) => {
    const isLast = idx === installments.length - 1;
    if (isLast) {
      const lastValue = Math.round((total - distributedTotal) * 100) / 100;
      return { ...inst, value: lastValue };
    }
    const val = Math.round(((total * inst.percent) / 100) * 100) / 100;
    distributedTotal += val;
    return { ...inst, value: val };
  });
  return results;
};
