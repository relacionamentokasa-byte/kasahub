-- Inserir perfil de teste se não existir
INSERT INTO profiles (id, full_name, display_name, role)
VALUES ('00000000-0000-0000-0000-000000000000', 'Admin Teste', 'Admin', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Teste de gatilho de Job Atribuído
-- Simulado via RPC direto
SELECT notify_user(
  '00000000-0000-0000-0000-000000000000',
  'Novo Job Atribuído',
  'Você foi designado como responsável do job Teste de Gatilho',
  'job',
  'jobs',
  gen_random_uuid(),
  '/jobs'
);

-- Verificar se inseriu
SELECT * FROM notifications WHERE user_id = '00000000-0000-0000-0000-000000000000' ORDER BY created_at DESC LIMIT 1;
