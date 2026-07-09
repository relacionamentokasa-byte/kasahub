
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS scheduled_adjustments jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.proposals.scheduled_adjustments IS
  'Array of {from_month:int, value:numeric, note?:text}. from_month is 1-based. Applied at/after this parcel until the next entry.';

CREATE OR REPLACE FUNCTION public.handle_proposal_acceptance()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_contract_id UUID;
    v_recurring_months INTEGER;
    v_i INTEGER;
    v_due_date DATE;
    v_parcel_value NUMERIC;
    v_adj JSONB;
    v_current_month INTEGER;
    v_matched NUMERIC;
BEGIN
    IF (NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted')) THEN
        INSERT INTO public.contracts (
            client_id, proposal_id, title, total_value, monthly_value,
            start_date, payment_method, status
        ) VALUES (
            NEW.client_id, NEW.id, NEW.title,
            COALESCE(NEW.total, 0),
            COALESCE(NEW.monthly_investment, 0),
            COALESCE(NEW.first_due_date, CURRENT_DATE),
            NEW.payment_method, 'active'
        ) RETURNING id INTO v_contract_id;

        v_recurring_months := COALESCE(NEW.recurring_months, 1);
        v_due_date := COALESCE(NEW.first_due_date, CURRENT_DATE);
        v_adj := COALESCE(NEW.scheduled_adjustments, '[]'::jsonb);

        FOR v_i IN 0..(v_recurring_months - 1) LOOP
            v_current_month := v_i + 1;

            IF NEW.contract_type = 'recurring' THEN
                v_parcel_value := COALESCE(NEW.monthly_investment, 0);
                -- pick the adjustment with greatest from_month <= v_current_month
                SELECT (elem->>'value')::numeric INTO v_matched
                  FROM jsonb_array_elements(v_adj) elem
                 WHERE (elem->>'from_month')::int <= v_current_month
                 ORDER BY (elem->>'from_month')::int DESC
                 LIMIT 1;
                IF v_matched IS NOT NULL THEN
                    v_parcel_value := v_matched;
                END IF;
            ELSE
                v_parcel_value := COALESCE(NEW.total, 0) / v_recurring_months;
            END IF;

            INSERT INTO public.transactions (
                description, amount, type, status, due_date,
                client_id, proposal_id, contract_id, payment_method
            ) VALUES (
                'Parcela ' || v_current_month || '/' || v_recurring_months || ' - ' || NEW.title,
                v_parcel_value,
                'income', 'pending',
                (v_due_date + (v_i || ' month')::interval)::date,
                NEW.client_id, NEW.id, v_contract_id, NEW.payment_method
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$function$;
