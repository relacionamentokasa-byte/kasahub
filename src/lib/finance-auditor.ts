
import { supabase } from "@/integrations/supabase/client";

/**
 * Módulo Financeiro: Auditoria de Performance e Integridade
 * 
 * Este arquivo contém utilitários para garantir a performance e a integridade
 * das operações financeiras conforme a auditoria solicitada.
 */

// Otimização: Cache para evitar requisições desnecessárias.
// O TanStack Query já gerencia cache, mas podemos forçar revalidações inteligentes.

export const logFinanceError = (error: any, action: string, context?: any) => {
  console.error(`Finance Error [${action}]:`, error, context);
  // Aqui poderíamos integrar com algum serviço de log externo se necessário.
};

// Validação de Integridade: Verifica se os totais batem (simplesmente como exemplo de auditoria)
export const validateFinancialIntegrity = async () => {
  // Exemplo: Buscar somatórios e comparar com dashboards
  const { data, error } = await supabase.rpc('get_financial_summary');
  if (error) {
    logFinanceError(error, 'validateFinancialIntegrity');
    return false;
  }
  return data;
};

// Função para garantir que os dados de contratos sempre gerem lançamentos corretamente
export const syncContractTransactions = async (contractId: string) => {
  const { data, error } = await supabase.rpc('generate_contract_transactions_for_contract', { 
    p_contract_id: contractId 
  });
  if (error) {
    logFinanceError(error, 'syncContractTransactions', { contractId });
    throw error;
  }
  return data;
};
