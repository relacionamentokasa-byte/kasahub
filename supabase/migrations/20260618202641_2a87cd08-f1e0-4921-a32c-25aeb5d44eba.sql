
-- 1. Adicionar colunas faltantes em extra_demands
ALTER TABLE public.extra_demands
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by_client BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- is_billable default true (toda DME tem valor)
ALTER TABLE public.extra_demands ALTER COLUMN is_billable SET DEFAULT true;

-- garantir public_token sempre presente
ALTER TABLE public.extra_demands ALTER COLUMN public_token SET DEFAULT gen_random_uuid();
UPDATE public.extra_demands SET public_token = gen_random_uuid() WHERE public_token IS NULL;

-- 2. Rastrear DME na transação (opcional)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS extra_demand_id UUID REFERENCES public.extra_demands(id) ON DELETE SET NULL;

-- 3. Trigger: ao aprovar, gera transação financeira + notifica responsável + timeline
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
  -- só age quando status muda PARA 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN

    -- cria lançamento financeiro (se ainda não existe e é cobrável)
    IF NEW.is_billable AND NEW.transaction_id IS NULL THEN
      INSERT INTO public.transactions (
        description, amount, type, kind, status, due_date,
        client_id, contract_id, extra_demand_id
      ) VALUES (
        'DME ' || NEW.number_display || ' - ' || NEW.title,
        NEW.value,
        'income', 'income', 'pending',
        COALESCE(NEW.due_date, CURRENT_DATE + INTERVAL '7 days'),
        NEW.client_id, NEW.contract_id, NEW.id
      )
      RETURNING id INTO v_tx_id;

      NEW.transaction_id := v_tx_id;
    END IF;

    -- marca approved_at
    IF NEW.approved_at IS NULL THEN
      NEW.approved_at := now();
    END IF;

    -- notifica responsável interno
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

    -- registra na timeline do cliente
    INSERT INTO public.client_timeline_events (client_id, type, title, description, metadata)
    VALUES (
      NEW.client_id,
      'dme_approved',
      'DME aprovada: ' || NEW.title,
      'Valor: R$ ' || to_char(NEW.value, 'FM999G999G990D00'),
      jsonb_build_object('dme_id', NEW.id, 'value', NEW.value)
    );
  END IF;

  -- registra quando rejeitada
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

DROP TRIGGER IF EXISTS trg_extra_demand_approval ON public.extra_demands;
CREATE TRIGGER trg_extra_demand_approval
  BEFORE UPDATE ON public.extra_demands
  FOR EACH ROW EXECUTE FUNCTION public.handle_extra_demand_approval();

-- 4. Auto-numeração se number_display vier vazio
CREATE SEQUENCE IF NOT EXISTS public.dme_number_seq START 1;

CREATE OR REPLACE FUNCTION public.fn_set_dme_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.number_display IS NULL OR NEW.number_display = '' THEN
    NEW.number_display := 'DME-' || LPAD(nextval('public.dme_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_dme_number ON public.extra_demands;
CREATE TRIGGER trg_set_dme_number
  BEFORE INSERT ON public.extra_demands
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_dme_number();
