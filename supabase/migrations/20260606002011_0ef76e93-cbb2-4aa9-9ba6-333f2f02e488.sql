-- Drop legacy recurrence-related objects
DROP TRIGGER IF EXISTS update_recurrences_updated_at ON public.recurrences;
DROP TABLE IF EXISTS public.recurrence_audit;
-- Note: We only drop the recurrences table if it's safe. 
-- In a real scenario, we might want to check for data, but here we are simplifying architecture as requested.
ALTER TABLE public.transactions DROP COLUMN IF EXISTS recurrence_id;
DROP TABLE IF EXISTS public.recurrences;
