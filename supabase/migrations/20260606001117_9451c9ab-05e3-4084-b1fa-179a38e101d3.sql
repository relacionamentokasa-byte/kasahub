-- 1. Create recurrences for existing contracts that have transactions
INSERT INTO public.recurrences (start_date, amount, description, contract_id, owner_id, status)
SELECT 
    MIN(t.due_date) as start_date,
    MAX(c.monthly_value) as amount,
    c.title as description,
    c.id as contract_id,
    c.owner_id,
    'active' as status
FROM public.contracts c
JOIN public.transactions t ON t.contract_id = c.id
WHERE c.status = 'active'
AND NOT EXISTS (SELECT 1 FROM public.recurrences r WHERE r.contract_id = c.id)
GROUP BY c.id, c.title, c.owner_id;

-- 2. Link existing transactions to the newly created recurrences
UPDATE public.transactions t
SET recurrence_id = r.id
FROM public.recurrences r
WHERE t.contract_id = r.contract_id
AND t.recurrence_id IS NULL;

-- 3. Also handle multi-installment transactions that are not linked to contracts but have installments
INSERT INTO public.recurrences (start_date, amount, description, owner_id, status)
SELECT 
    MIN(t.due_date) as start_date,
    SUM(t.amount) as amount, -- approximation for multi-installment total
    MAX(t.description) as description,
    t.owner_id,
    'active' as status
FROM public.transactions t
WHERE t.installment_total > 1 
AND t.recurrence_id IS NULL
GROUP BY t.description, t.owner_id, t.installment_total
HAVING COUNT(*) > 1;

-- 4. Link those installments to the new recurrences
UPDATE public.transactions t
SET recurrence_id = r.id
FROM public.recurrences r
WHERE t.description = r.description -- This is a bit loose but works for installments like "Job X (1/3)"
AND t.owner_id = r.owner_id
AND t.recurrence_id IS NULL
AND t.installment_total > 1;
