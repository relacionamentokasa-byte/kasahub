-- 1. Remover tabelas legadas relacionadas a fluxos
DROP TABLE IF EXISTS public.operational_flow_dependencies CASCADE;
DROP TABLE IF EXISTS public.operational_flow_checklists CASCADE;
DROP TABLE IF EXISTS public.operational_flow_jobs CASCADE;
DROP TABLE IF EXISTS public.operational_flows CASCADE;

-- 2. Limpeza de referências remanescentes em outras tabelas (se houver)
-- (Já removido column services.operational_flow_id na migração anterior)
-- (Jobs e outros já foram reestruturados)
