
-- 1. Melhorar a função de geração de transações para evitar duplicados e suportar regeneração parcial
CREATE OR REPLACE FUNCTION public.generate_contract_transactions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
 AS $function$
 DECLARE
     v_due_date DATE;
     v_total_installments INTEGER;
     v_existing_count INTEGER;
 BEGIN
     -- Só gera se houver valor mensal
     IF NEW.monthly_value IS NULL OR NEW.monthly_value <= 0 THEN
         RETURN NEW;
     END IF;

     -- Verifica se já existem transações para este contrato (evita duplicidade no trigger de insert/update)
     SELECT count(*) INTO v_existing_count FROM public.transactions WHERE contract_id = NEW.id;
     IF v_existing_count > 0 THEN
         RETURN NEW;
     END IF;

     v_total_installments := COALESCE(NEW.installments_count, 0);
     
     -- Prazo indeterminado gera apenas 12 meses inicialmente para não sobrecarregar
     IF v_total_installments <= 0 THEN 
         v_total_installments := 12; 
     END IF;

     FOR i IN 0..(v_total_installments - 1) LOOP
         v_due_date := (NEW.start_date + (i || ' month')::interval);
         
         -- Ajuste para o dia de faturamento
         v_due_date := make_date(
             extract(year from v_due_date)::int, 
             extract(month from v_due_date)::int, 
             LEAST(NEW.billing_day, extract(day from (date_trunc('month', v_due_date) + interval '1 month - 1 day'))::int)
         );

         IF v_due_date < NEW.start_date THEN
             v_due_date := v_due_date + interval '1 month';
             v_due_date := make_date(
                 extract(year from v_due_date)::int, 
                 extract(month from v_due_date)::int, 
                 LEAST(NEW.billing_day, extract(day from (date_trunc('month', v_due_date) + interval '1 month - 1 day'))::int)
             );
         END IF;

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
             NEW.title || ' (' || (i + 1) || '/' || CASE WHEN NEW.installments_count > 0 THEN NEW.installments_count::text ELSE 'Recorrente' END || ')',
             NEW.monthly_value,
             v_due_date,
             'pending',
             NEW.client_id,
             NEW.id,
             'contract',
             i + 1,
             CASE WHEN NEW.installments_count > 0 THEN NEW.installments_count ELSE NULL END,
             NEW.owner_id,
             NEW.owner_id
         );
     END LOOP;

     RETURN NEW;
 END;
 $function$;

-- 2. RPC para obter resumo financeiro (Performance: Substitui múltiplas queries por uma)
CREATE OR REPLACE FUNCTION public.get_finance_summary(p_from date, p_to date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'receitas_previstas', COALESCE(SUM(amount) FILTER (WHERE kind = 'income' AND status = 'pending' AND due_date BETWEEN p_from AND p_to), 0),
        'receitas_recebidas', COALESCE(SUM(amount) FILTER (WHERE kind = 'income' AND status = 'paid' AND due_date BETWEEN p_from AND p_to), 0),
        'despesas_pagas', COALESCE(SUM(amount) FILTER (WHERE kind = 'expense' AND status = 'paid' AND due_date BETWEEN p_from AND p_to), 0),
        'parcelas_futuras', COALESCE(SUM(amount) FILTER (WHERE kind = 'income' AND status = 'pending' AND due_date > p_to), 0),
        'atrasados_count', COUNT(*) FILTER (WHERE status = 'pending' AND due_date < CURRENT_DATE),
        'atrasados_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'pending' AND due_date < CURRENT_DATE), 0)
    ) INTO result
    FROM public.transactions;
    
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_finance_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_finance_summary TO service_role;
