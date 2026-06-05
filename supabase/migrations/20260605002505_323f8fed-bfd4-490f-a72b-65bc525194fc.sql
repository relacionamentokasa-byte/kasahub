
CREATE OR REPLACE FUNCTION public.account_balance(_account_id uuid)
RETURNS numeric
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT
    COALESCE((SELECT initial_balance FROM public.bank_accounts WHERE id = _account_id), 0)
    + COALESCE((SELECT sum(CASE WHEN kind='income' THEN amount ELSE -amount END)
                FROM public.transactions
                WHERE account_id = _account_id AND status = 'paid'), 0);
$$;
REVOKE EXECUTE ON FUNCTION public.account_balance(uuid) FROM anon;
