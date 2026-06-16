
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS address_number TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS commercial_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS commercial_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS commercial_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS financial_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS financial_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS financial_contact_email TEXT;
