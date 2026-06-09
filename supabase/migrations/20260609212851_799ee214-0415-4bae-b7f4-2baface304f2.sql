-- Criar a view que combina perfis com e-mails da tabela auth.users
CREATE OR REPLACE VIEW public.profiles_with_email AS
SELECT 
  p.*,
  u.email
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id;

-- Garantir acesso à view para usuários autenticados e o service role
GRANT SELECT ON public.profiles_with_email TO authenticated;
GRANT SELECT ON public.profiles_with_email TO service_role;