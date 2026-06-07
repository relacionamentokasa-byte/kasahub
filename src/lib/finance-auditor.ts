
import { supabase } from "@/integrations/supabase/client";

/**
 * Módulo Financeiro: Auditoria de Performance e Integridade
 * 
 * Este arquivo contém utilitários para garantir a performance e a integridade
 * das operações financeiras conforme a auditoria solicitada.
 */

export const logFinanceError = (error: any, action: string, context?: any) => {
  console.error(`Finance Error [${action}]:`, error, context);
};

// Validação de Integridade: Verifica se os totais batem via RPC otimizado
export const getFinancialSummary = async (from: string, to: string) => {
  const { data, error } = await supabase.rpc('get_finance_summary', { 
    p_from: from, 
    p_to: to 
  });
  
  if (error) {
    logFinanceError(error, 'getFinancialSummary');
    return null;
  }
  return data;
};
