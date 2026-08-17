-- Função para desconsolidar lote de DME de forma atômica
CREATE OR REPLACE FUNCTION public.unconsolidate_dme_batch(
  p_batch_id UUID,
  p_restore_individual_transactions BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch_record RECORD;
  v_consolidated_tx_id UUID;
  v_dme_ids UUID[];
  v_restored_tx_ids UUID[] := '{}';
  v_kept_cancelled_tx_ids UUID[] := '{}';
  v_result JSONB;
BEGIN
  -- 1. Validar e travar o lote para evitar concorrência
  SELECT * INTO v_batch_record 
  FROM dme_batches 
  WHERE id = p_batch_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote % não encontrado.', p_batch_id;
  END IF;

  v_consolidated_tx_id := v_batch_record.consolidated_transaction_id;

  -- 2. Verificar se a transação consolidada está paga
  IF v_consolidated_tx_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM transactions WHERE id = v_consolidated_tx_id AND status = 'paid') THEN
      RAISE EXCEPTION 'Este lote possui uma transação consolidada já paga e não pode ser desconsolidado.';
    END IF;
    
    -- Cancelar a transação consolidada
    UPDATE transactions 
    SET status = 'cancelled' 
    WHERE id = v_consolidated_tx_id;
  END IF;

  -- 3. Identificar DMEs vinculadas
  SELECT array_agg(extra_demand_id) INTO v_dme_ids
  FROM dme_batch_items
  WHERE batch_id = p_batch_id;

  -- 4. Processar DMEs e suas transações individuais
  IF v_dme_ids IS NOT NULL THEN
    DECLARE
      v_dme_record RECORD;
      v_actual_tx_id UUID;
    BEGIN
      FOR v_dme_record IN 
        SELECT id, transaction_id 
        FROM extra_demands 
        WHERE id = ANY(v_dme_ids)
      LOOP
        -- Se solicitado restaurar e a DME tiver uma transação vinculada
        IF p_restore_individual_transactions AND v_dme_record.transaction_id IS NOT NULL THEN
          -- Tentar restaurar para pending somente se estiver cancelled
          UPDATE transactions
          SET status = 'pending'
          WHERE id = v_dme_record.transaction_id
            AND status = 'cancelled'
          RETURNING id INTO v_actual_tx_id;

          IF v_actual_tx_id IS NOT NULL THEN
            v_restored_tx_ids := v_restored_tx_ids || v_actual_tx_id;
          ELSE
            -- Se não restaurou (não estava cancelled ou outro motivo), registra como mantida
            v_kept_cancelled_tx_ids := v_kept_cancelled_tx_ids || v_dme_record.transaction_id;
          END IF;
        END IF;

        -- Desvincular consolidated_transaction_id da DME
        UPDATE extra_demands
        SET consolidated_transaction_id = NULL
        WHERE id = v_dme_record.id;
      END LOOP;
    END;
  END IF;

  -- 5. Remover itens e o lote
  DELETE FROM dme_batch_items WHERE batch_id = p_batch_id;
  DELETE FROM dme_batches WHERE id = p_batch_id;

  -- 6. Construir resultado
  v_result := jsonb_build_object(
    'batch_id', p_batch_id,
    'friendly_number', v_batch_record.friendly_number,
    'consolidated_transaction_id', v_consolidated_tx_id,
    'restored_transaction_ids', v_restored_tx_ids,
    'kept_cancelled_tx_ids', v_kept_cancelled_tx_ids,
    'dme_ids', v_dme_ids,
    'count_restored', COALESCE(array_length(v_restored_tx_ids, 1), 0),
    'count_dmes', COALESCE(array_length(v_dme_ids, 1), 0),
    'option_restored', p_restore_individual_transactions
  );

  RETURN v_result;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.unconsolidate_dme_batch(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unconsolidate_dme_batch(UUID, BOOLEAN) TO service_role;
