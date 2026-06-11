CREATE OR REPLACE FUNCTION public.force_generate_contract_transactions(p_contract_id UUID)
RETURNS void AS $$
DECLARE
    v_contract RECORD;
    v_due_date DATE;
    v_total_installments INTEGER;
    v_start_index INTEGER := 0;
BEGIN
    -- 1. Buscar dados do contrato
    SELECT * INTO v_contract FROM public.contracts WHERE id = p_contract_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contrato não encontrado.';
    END IF;

    -- 2. Limpar transações pendentes futuras para evitar duplicados se o usuário clicar várias vezes
    -- Mantemos as pagas (status = 'paid') e as que já passaram do vencimento (opcional, mas seguro)
    DELETE FROM public.transactions 
    WHERE contract_id = p_contract_id 
      AND status = 'pending' 
      AND due_date >= CURRENT_DATE;

    -- 3. Calcular quantas parcelas gerar
    v_total_installments := COALESCE(v_contract.installments_count, 0);
    IF v_total_installments <= 0 THEN 
        v_total_installments := 12; -- Padrão de 12 meses para recorrentes
    END IF;

    -- 4. Identificar de onde começar
    -- Se já existem parcelas (ex: apagaram só as futuras), podemos tentar descobrir o próximo index
    SELECT COALESCE(MAX(installment_number), 0) INTO v_start_index 
    FROM public.transactions 
    WHERE contract_id = p_contract_id;

    -- 5. Loop de geração (similar ao trigger original)
    FOR i IN v_start_index..(v_total_installments - 1) LOOP
        v_due_date := (v_contract.start_date + (i || ' month')::interval);
        
        -- Ajuste para o dia de faturamento
        v_due_date := make_date(
            extract(year from v_due_date)::int, 
            extract(month from v_due_date)::int, 
            LEAST(v_contract.billing_day, extract(day from (date_trunc('month', v_due_date) + interval '1 month - 1 day'))::int)
        );

        -- Garantir que não geramos datas no passado se estivermos forçando
        -- (Opcional: se o usuário apagou as antigas também, ele pode querer tudo de volta)
        -- Aqui vamos gerar apenas se a data for >= hoje para ser mais seguro contra bagunça financeira
        IF v_due_date >= CURRENT_DATE THEN
            INSERT INTO public.transactions (
                kind,
                description,
                amount,
                due_date,
                status,
                client_id,
                contract_id,
                origin_type,
                installment_number,
                installment_total,
                owner_id,
                created_by
            ) VALUES (
                'income',
                v_contract.title || ' (' || (i + 1) || '/' || CASE WHEN v_contract.installments_count > 0 THEN v_contract.installments_count::text ELSE 'Recorrente' END || ')',
                v_contract.monthly_value,
                v_due_date,
                'pending',
                v_contract.client_id,
                v_contract.id,
                'contract',
                i + 1,
                CASE WHEN v_contract.installments_count > 0 THEN v_contract.installments_count ELSE NULL END,
                v_contract.owner_id,
                v_contract.owner_id
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.force_generate_contract_transactions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.force_generate_contract_transactions(UUID) TO service_role;