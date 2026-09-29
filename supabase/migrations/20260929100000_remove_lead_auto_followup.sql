-- Remove a trigger de follow-up automático ao criar ou mover leads
DROP TRIGGER IF EXISTS trg_lead_auto_followup ON public.leads;
DROP FUNCTION IF EXISTS public.fn_lead_auto_followup();

-- Limpa tarefas de follow-up automáticas pendentes que foram geradas anteriormente
DELETE FROM public.lead_tasks
 WHERE auto_generated = true
   AND status = 'pending';
