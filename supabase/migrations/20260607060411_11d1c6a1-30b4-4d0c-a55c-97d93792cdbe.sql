ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS total_steps INTEGER DEFAULT 0;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS completed_steps INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION public.calculate_job_progress()
RETURNS trigger AS $$
DECLARE
    v_total INTEGER;
    v_completed INTEGER;
    v_job_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_job_id := OLD.job_id;
    ELSE
        v_job_id := NEW.job_id;
    END IF;

    SELECT COUNT(*) INTO v_total FROM public.job_checklist WHERE job_id = v_job_id;
    SELECT COUNT(*) INTO v_completed FROM public.job_checklist WHERE job_id = v_job_id AND done = true;

    UPDATE public.jobs
    SET 
        total_steps = v_total,
        completed_steps = v_completed,
        progress_percentage = CASE WHEN v_total > 0 THEN (v_completed * 100 / v_total) ELSE 0 END,
        updated_at = now()
    WHERE id = v_job_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sincronizar dados existentes
UPDATE public.jobs j
SET 
    total_steps = (SELECT COUNT(*) FROM public.job_checklist WHERE job_id = j.id),
    completed_steps = (SELECT COUNT(*) FROM public.job_checklist WHERE job_id = j.id AND done = true),
    progress_percentage = CASE 
        WHEN (SELECT COUNT(*) FROM public.job_checklist WHERE job_id = j.id) > 0 
        THEN ((SELECT COUNT(*) FROM public.job_checklist WHERE job_id = j.id AND done = true) * 100 / (SELECT COUNT(*) FROM public.job_checklist WHERE job_id = j.id))
        ELSE 0 
    END;
