-- Fix duplicated "DME" prefix in DME approval transactions
CREATE OR REPLACE FUNCTION public.handle_extra_demand_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id UUID;
  v_client_name TEXT;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    IF NEW.is_billable AND NEW.transaction_id IS NULL THEN
      INSERT INTO public.transactions (
        description, amount, type, kind, status, due_date,
        client_id, contract_id, extra_demand_id
      ) VALUES (
        NEW.number_display || ' - ' || NEW.title,
        NEW.value,
        'income', 'income', 'pending',
        COALESCE(NEW.due_date, CURRENT_DATE + INTERVAL '7 days'),
        NEW.client_id, NEW.contract_id, NEW.id
      )
      RETURNING id INTO v_tx_id;
      NEW.transaction_id := v_tx_id;
    END IF;

    IF NEW.approved_at IS NULL THEN
      NEW.approved_at := now();
    END IF;

    SELECT COALESCE(name, company) INTO v_client_name FROM public.clients WHERE id = NEW.client_id;

    IF NEW.responsible_id IS NOT NULL THEN
      INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link)
      VALUES (
        NEW.responsible_id,
        'DME aprovada pelo cliente',
        COALESCE(v_client_name, 'Cliente') || ' aprovou a DME: ' || NEW.title,
        'success',
        '/dmes?id=' || NEW.id
      );
    END IF;

    INSERT INTO public.client_timeline_events (client_id, type, title, description, metadata)
    VALUES (
      NEW.client_id,
      'dme_approved',
      'DME aprovada: ' || NEW.title,
      'Valor: R$ ' || to_char(NEW.value, 'FM999G999G990D00'),
      jsonb_build_object('dme_id', NEW.id, 'value', NEW.value)
    );
  END IF;

  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status <> 'rejected') THEN
    IF NEW.rejected_at IS NULL THEN
      NEW.rejected_at := now();
    END IF;

    IF NEW.responsible_id IS NOT NULL THEN
      INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link)
      VALUES (
        NEW.responsible_id,
        'DME recusada pelo cliente',
        'A DME "' || NEW.title || '" foi recusada' ||
          CASE WHEN NEW.rejection_reason IS NOT NULL THEN ': ' || NEW.rejection_reason ELSE '' END,
        'warning',
        '/dmes?id=' || NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill: remove o prefixo "DME " duplicado das transações já criadas
UPDATE public.transactions t
SET description = regexp_replace(t.description, '^DME (DME-\d+)', '\1')
WHERE t.extra_demand_id IS NOT NULL
  AND t.description ~ '^DME DME-\d+';
