CREATE OR REPLACE FUNCTION public.generate_contract_transactions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 DECLARE
     v_due_date DATE;
     v_total_installments INTEGER;
 BEGIN
     -- Only generate if there is a monthly value
     IF NEW.monthly_value IS NULL OR NEW.monthly_value <= 0 THEN
         RETURN NEW;
     END IF;

     -- v_total_installments = 0 or NULL means indeterminate term
     v_total_installments := COALESCE(NEW.installments_count, 0);
     
     -- For indeterminate terms, we generate only the first installment (the next billing)
     -- The system logic or a cron job should handle subsequent ones if needed, 
     -- but according to instructions: "Gerar apenas o próximo vencimento."
     IF v_total_installments <= 0 THEN 
         v_total_installments := 1; 
     END IF;

     FOR i IN 0..(v_total_installments - 1) LOOP
         v_due_date := (NEW.start_date + (i || ' month')::interval);
         
         -- Adjust to billing day
         -- Handle months with fewer days (e.g., Feb 30 -> Feb 28)
         v_due_date := make_date(
             extract(year from v_due_date)::int, 
             extract(month from v_due_date)::int, 
             LEAST(NEW.billing_day, extract(day from (date_trunc('month', v_due_date) + interval '1 month - 1 day'))::int)
         );

         -- Don't create if due_date is before start_date (unless it's the first one and we want it)
         IF v_due_date < NEW.start_date THEN
             v_due_date := v_due_date + interval '1 month';
             -- Re-adjust billing day for the next month
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
             auth.uid()
         );
     END LOOP;

     RETURN NEW;
 END;
 $function$;
