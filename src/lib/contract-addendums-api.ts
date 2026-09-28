import { supabase } from "@/integrations/supabase/client";
import type { ContractAddendum } from "@/types/contract-addendums";
import { addClientService, updateClientService } from "@/lib/client-services-api";

const ADDENDUMS_STORAGE_KEY = "kasa_contract_addendums";

export async function fetchContractAddendums(contractId: string): Promise<ContractAddendum[]> {
  try {
    const { data: contract, error } = await supabase
      .from("contracts")
      .select("proposal_id, notes, title")
      .eq("id", contractId)
      .single();

    if (error) throw error;

    // Tenta carregar do campo customizado / notes ou storage
    let addendums: ContractAddendum[] = [];
    if (contract?.notes) {
      try {
        const parsed = JSON.parse(contract.notes);
        if (Array.isArray(parsed.addendums)) {
          addendums = parsed.addendums;
        }
      } catch {
        // notes era texto puro
      }
    }

    if (addendums.length === 0) {
      const local = localStorage.getItem(`${ADDENDUMS_STORAGE_KEY}_${contractId}`);
      if (local) {
        addendums = JSON.parse(local);
      }
    }

    return addendums.sort((a, b) => b.addendum_number - a.addendum_number);
  } catch (err) {
    console.error("Erro ao buscar aditivos:", err);
    return [];
  }
}

export async function createAndApplyAddendum(input: {
  contractId: string;
  clientId: string;
  type: ContractAddendum["type"];
  title: string;
  effectiveDate: string;
  previousMonthlyValue: number;
  newMonthlyValue: number;
  oneTimeValue?: number;
  oneTimeDueDate?: string;
  servicesToAdd?: { service_id: string; monthly_value: number; name?: string }[];
  servicesToRemove?: string[]; // IDs de client_services
  notes?: string;
  syncFutureTransactions?: boolean;
}): Promise<ContractAddendum> {
  // 1. Obter aditivos existentes para calcular o próximo número
  const existing = await fetchContractAddendums(input.contractId);
  const nextNumber = existing.length + 1;

  const newAddendum: ContractAddendum = {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    contract_id: input.contractId,
    client_id: input.clientId,
    addendum_number: nextNumber,
    title: input.title,
    type: input.type,
    effective_date: input.effectiveDate,
    previous_monthly_value: input.previousMonthlyValue,
    new_monthly_value: input.newMonthlyValue,
    one_time_value: input.oneTimeValue,
    one_time_due_date: input.oneTimeDueDate,
    services_to_add: input.servicesToAdd,
    services_to_remove: input.servicesToRemove,
    notes: input.notes,
    status: "applied",
    created_at: new Date().toISOString(),
    applied_at: new Date().toISOString(),
  };

  // 2. Atualizar o Contrato Principal (monthly_value e total_value se recorrente)
  const { data: currentContract } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", input.contractId)
    .single();

  if (currentContract) {
    let currentNotesObj: Record<string, any> = {};
    try {
      if (currentContract.notes) currentNotesObj = JSON.parse(currentContract.notes);
    } catch {
      currentNotesObj = { legacy_notes: currentContract.notes };
    }

    const updatedAddendums = [newAddendum, ...existing];
    currentNotesObj.addendums = updatedAddendums;

    await supabase
      .from("contracts")
      .update({
        monthly_value: input.newMonthlyValue,
        notes: JSON.stringify(currentNotesObj),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.contractId);

    // Salva cópia local para fallback rápido
    localStorage.setItem(
      `${ADDENDUMS_STORAGE_KEY}_${input.contractId}`,
      JSON.stringify(updatedAddendums)
    );
  }

  // 3. Atualizar o cadastro do Cliente (contract_value)
  await supabase
    .from("clients")
    .update({
      contract_value: input.newMonthlyValue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.clientId);

  // 4. Inserir novos serviços em client_services
  if (input.servicesToAdd && input.servicesToAdd.length > 0) {
    for (const s of input.servicesToAdd) {
      await addClientService({
        client_id: input.clientId,
        service_id: s.service_id,
        contract_type: "recurring",
        monthly_value: s.monthly_value,
        start_date: input.effectiveDate,
        notes: `Adicionado via ${nextNumber}º Termo Aditivo`,
      });
    }
  }

  // 5. Cancelar serviços removidos em client_services
  if (input.servicesToRemove && input.servicesToRemove.length > 0) {
    for (const serviceId of input.servicesToRemove) {
      await updateClientService(serviceId, {
        notes: `Cancelado via ${nextNumber}º Termo Aditivo em ${input.effectiveDate}`,
      });
    }
  }

  // 6. Sincronizar Transações Financeiras Futuras (apenas as mensalidades recorrentes do contrato)
  if (input.syncFutureTransactions !== false && input.newMonthlyValue !== input.previousMonthlyValue) {
    // Busca transações recorrentes pendentes vinculadas a este contrato específico com vencimento >= effectiveDate
    let query = supabase
      .from("transactions")
      .select("id, amount, valor_previsto, due_date, description")
      .eq("client_id", input.clientId)
      .eq("type", "income")
      .eq("status", "pending")
      .gte("due_date", input.effectiveDate);

    // Se temos o contract_id, filtra exclusivamente as transações desse contrato
    if (input.contractId) {
      query = query.eq("contract_id", input.contractId);
    } else {
      query = query.eq("is_recurring", true);
    }

    const { data: pendingTrans } = await query;

    if (pendingTrans && pendingTrans.length > 0) {
      for (const t of pendingTrans) {
        // Mantém a descrição original com prefixo ou numeração se existir, apenas atualizando o valor
        const originalDesc = t.description || "";
        const updatedDesc = originalDesc.includes("Aditivo")
          ? originalDesc
          : `${originalDesc} (Reajustado via ${nextNumber}º Aditivo)`.trim();

        await supabase
          .from("transactions")
          .update({
            amount: input.newMonthlyValue,
            valor_previsto: input.newMonthlyValue,
            description: updatedDesc,
          })
          .eq("id", t.id);
      }
    }
  }

  // 7. Se houver valor avulso / setup, gerar lançamento de receita pontual
  if (input.oneTimeValue && input.oneTimeValue > 0) {
    const dueDate = input.oneTimeDueDate || input.effectiveDate;
    await supabase.from("transactions").insert({
      client_id: input.clientId,
      contract_id: input.contractId,
      type: "income",
      kind: "income",
      status: "pending",
      amount: input.oneTimeValue,
      valor_previsto: input.oneTimeValue,
      due_date: dueDate,
      description: `Taxa / Valor Avulso - ${nextNumber}º Termo Aditivo (${input.title})`,
      category: "Aditivo Contratual",
      is_recurring: false,
    });
  }

  // 8. Registrar evento na Timeline do Cliente
  await supabase.from("client_timeline_events").insert({
    client_id: input.clientId,
    title: `${nextNumber}º Termo Aditivo Aplicado`,
    type: "contract_updated",
    description: `Aditivo '${input.title}' formalizado com vigência a partir de ${new Date(
      input.effectiveDate
    ).toLocaleDateString()}. Fee atualizado de R$ ${input.previousMonthlyValue.toFixed(
      2
    )} para R$ ${input.newMonthlyValue.toFixed(2)}.`,
    metadata: {
      addendum_id: newAddendum.id,
      addendum_number: nextNumber,
      previous_monthly_value: input.previousMonthlyValue,
      new_monthly_value: input.newMonthlyValue,
      one_time_value: input.oneTimeValue || 0,
    },
  });

  return newAddendum;
}
