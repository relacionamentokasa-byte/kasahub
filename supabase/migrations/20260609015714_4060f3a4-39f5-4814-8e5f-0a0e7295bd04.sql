CREATE OR REPLACE FUNCTION public.generate_commission_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 AS $function$
DECLARE
    v_partner_id UUID;
    v_commission_type TEXT;
    v_commission_value NUMERIC;
    v_amount NUMERIC;
    v_contract_start_date DATE;
    v_months_passed INTEGER;
    v_contract_status TEXT;
    v_percentage NUMERIC;
BEGIN
    -- Só processa se for recebimento de contrato
    IF NEW.kind = 'income' AND NEW.status = 'paid' AND NEW.contract_id IS NOT NULL THEN
        -- Busca o parceiro e detalhes do contrato
        SELECT partner_id, start_date, status 
        INTO v_partner_id, v_contract_start_date, v_contract_status 
        FROM public.contracts 
        WHERE id = NEW.contract_id;
        
        IF v_partner_id IS NOT NULL AND v_contract_status = 'active' THEN
            -- Calcula quantos meses se passaram desde o início do contrato
            -- Consideramos o mês atual como 1 se estiver no primeiro mês
            v_months_passed := EXTRACT(YEAR FROM age(NEW.due_date, v_contract_start_date)) * 12 + EXTRACT(MONTH FROM age(NEW.due_date, v_contract_start_date)) + 1;

            -- Aplica a nova regra de comissão (20% no 1º mês, 10% nos seguintes)
            IF v_months_passed = 1 THEN
                v_percentage := 20;
            ELSE
                v_percentage := 10;
            END IF;

            v_amount := (NEW.amount * v_percentage) / 100;
            
            -- Gera conta a pagar (comissão)
            INSERT INTO public.transactions (
                description,
                amount,
                kind,
                status,
                due_date,
                client_id,
                contract_id,
                partner_id,
                owner_id,
                notes
            ) VALUES (
                'Comissão: ' || NEW.description,
                v_amount,
                'expense',
                'pending',
                CURRENT_DATE + INTERVAL '7 days',
                NEW.client_id,
                NEW.contract_id,
                v_partner_id,
                NEW.owner_id,
                'Mês ' || v_months_passed || ' do contrato (' || v_percentage || '%)'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;
