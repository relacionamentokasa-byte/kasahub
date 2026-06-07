CREATE OR REPLACE FUNCTION public.fn_initialize_job_checklist()
RETURNS TRIGGER AS $$
DECLARE
    v_checklist JSONB;
    v_item JSONB;
    v_idx INTEGER := 0;
BEGIN
    -- Busca os itens de checklist do serviço vinculado
    SELECT checklist_items INTO v_checklist
    FROM public.services
    WHERE id = NEW.service_id;

    -- Se houver itens, insere-os no checklist do job
    IF v_checklist IS NOT NULL AND jsonb_array_length(v_checklist) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_checklist)
        LOOP
            INSERT INTO public.job_checklist (job_id, content, order_index, done)
            VALUES (
                NEW.id,
                COALESCE(v_item->>'text', v_item#>>'{}'), -- Suporta {"text": "..."} ou apenas string
                v_idx,
                false
            );
            v_idx := v_idx + 1;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para inicializar o checklist após criar um job
DROP TRIGGER IF EXISTS tr_initialize_job_checklist ON public.jobs;
CREATE TRIGGER tr_initialize_job_checklist
    AFTER INSERT ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_initialize_job_checklist();

-- Melhorar a função de progresso para lidar com divisão por zero e garantir arredondamento
CREATE OR REPLACE FUNCTION public.calculate_job_progress()
RETURNS trigger AS $$
DECLARE
    total_steps INTEGER;
    completed_steps INTEGER;
    v_job_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_job_id := OLD.job_id;
    ELSE
        v_job_id := NEW.job_id;
    END IF;

    SELECT COUNT(*) INTO total_steps FROM public.job_checklist WHERE job_id = v_job_id;
    SELECT COUNT(*) INTO completed_steps FROM public.job_checklist WHERE job_id = v_job_id AND done = true;

    IF total_steps > 0 THEN
        UPDATE public.jobs
        SET progress_percentage = (completed_steps * 100 / total_steps)
        WHERE id = v_job_id;
    ELSE
        UPDATE public.jobs
        SET progress_percentage = 0
        WHERE id = v_job_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
