-- 1. Vincular Serviço ao Fluxo Operacional (Garantir coluna existe)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'services' AND COLUMN_NAME = 'operational_flow_id') THEN
        ALTER TABLE public.services ADD COLUMN operational_flow_id UUID REFERENCES public.operational_flows(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Garantir coluna flow_job_id na tabela jobs para rastreamento
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'jobs' AND COLUMN_NAME = 'flow_job_id') THEN
        ALTER TABLE public.jobs ADD COLUMN flow_job_id UUID REFERENCES public.operational_flow_jobs(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Biblioteca de Modelos Padrão (Sem conflito)
INSERT INTO public.operational_flows (name, description, status, default_project_name)
SELECT 'Conteúdo e Posicionamento', 'Fluxo padrão para gestão de redes sociais e autoridade.', 'active', 'Gestão Mensal - {{cliente}}'
WHERE NOT EXISTS (SELECT 1 FROM public.operational_flows WHERE name = 'Conteúdo e Posicionamento');

INSERT INTO public.operational_flows (name, description, status, default_project_name)
SELECT 'Gestão de Tráfego', 'Fluxo focado em performance e anúncios.', 'active', 'Tráfego Pago - {{cliente}}'
WHERE NOT EXISTS (SELECT 1 FROM public.operational_flows WHERE name = 'Gestão de Tráfego');

INSERT INTO public.operational_flows (name, description, status, default_project_name)
SELECT 'Landing Page', 'Desenvolvimento de página de conversão.', 'active', 'Web: Landing Page - {{cliente}}'
WHERE NOT EXISTS (SELECT 1 FROM public.operational_flows WHERE name = 'Landing Page');

-- 4. Função para Automação (Trigger ao criar contrato)
CREATE OR REPLACE FUNCTION public.automate_contract_setup()
RETURNS TRIGGER AS $$
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
    FOR svc_record IN 
        SELECT s.* FROM public.services s
        JOIN public.client_services cs ON cs.service_id = s.id
        WHERE cs.contract_id = NEW.id
    LOOP
        IF svc_record.operational_flow_id IS NOT NULL THEN
            -- Buscar fluxo
            SELECT * INTO flow_record FROM public.operational_flows WHERE id = svc_record.operational_flow_id;
            
            -- Criar Projeto baseado no Fluxo
            INSERT INTO public.projects (name, client_id, contract_id, status, description)
            VALUES (
                REPLACE(COALESCE(flow_record.default_project_name, svc_record.name), '{{cliente}}', client_name_val),
                NEW.client_id,
                NEW.id,
                'active',
                flow_record.description
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
$$ LANGUAGE plpgsql;

-- Re-aplicar trigger
DROP TRIGGER IF EXISTS tr_automate_contract_setup ON public.contracts;
CREATE TRIGGER tr_automate_contract_setup
AFTER INSERT ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.automate_contract_setup();
