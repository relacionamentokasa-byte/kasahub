CREATE OR REPLACE FUNCTION public.automate_contract_setup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    svc_record RECORD;
    flow_record RECORD;
    stage_record RECORD;
    flow_job_record RECORD;
    new_project_id UUID;
    new_job_id UUID;
    chk_record RECORD;
    client_name_val TEXT;
BEGIN
    -- Pegar nome do cliente
    SELECT name INTO client_name_val FROM public.clients WHERE id = NEW.client_id;

    -- Buscar fluxos vinculados aos serviços do contrato
    -- Corrigido: Não usamos cs.contract_id pois a coluna não existe. 
    -- Filtramos serviços que pertencem ao cliente (que é o dono do contrato) e estão na lista de service_ids do contrato.
    FOR svc_record IN 
        SELECT s.* FROM public.services s
        WHERE s.id = ANY(NEW.service_ids)
    LOOP
        IF svc_record.operational_flow_id IS NOT NULL THEN
            -- Buscar fluxo
            SELECT * INTO flow_record FROM public.operational_flows WHERE id = svc_record.operational_flow_id;
            
            -- Criar Projeto baseado no Fluxo
            INSERT INTO public.projects (name, client_id, contract_id, status, description, type)
            VALUES (
                REPLACE(COALESCE(flow_record.default_project_name, svc_record.name), '{{cliente}}', client_name_val),
                NEW.client_id,
                NEW.id,
                'active',
                flow_record.description,
                'automatic'
            ) RETURNING id INTO new_project_id;

            -- Iterar sobre estágios do fluxo
            FOR stage_record IN SELECT * FROM public.operational_flow_stages WHERE flow_id = flow_record.id ORDER BY "order" ASC LOOP
                -- Iterar sobre jobs da etapa
                FOR flow_job_record IN SELECT * FROM public.operational_flow_jobs WHERE stage_id = stage_record.id ORDER BY "order" ASC LOOP
                    
                    INSERT INTO public.jobs (
                        title, project_id, client_id, status, priority, 
                        due_date, job_type, custom_fields_schema, flow_job_id
                    )
                    VALUES (
                        flow_job_record.name,
                        new_project_id,
                        NEW.client_id,
                        'not_started',
                        'normal',
                        now() + (flow_job_record.sla_days || ' days')::interval,
                        flow_job_record.job_type,
                        flow_job_record.custom_fields_schema,
                        flow_job_record.id
                    ) RETURNING id INTO new_job_id;

                    -- Checklists do job do fluxo
                    FOR chk_record IN SELECT * FROM public.operational_flow_checklists WHERE flow_job_id = flow_job_record.id ORDER BY "order" ASC LOOP
                        INSERT INTO public.job_checklist (job_id, content, done, order_index)
                        VALUES (new_job_id, chk_record.item_text, false, chk_record.order);
                    END LOOP;
                END LOOP;
            END LOOP;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$function$;