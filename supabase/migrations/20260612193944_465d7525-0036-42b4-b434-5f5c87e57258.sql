ALTER TABLE public.proposals REPLICA IDENTITY FULL;
ALTER TABLE public.proposal_items REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposal_items;