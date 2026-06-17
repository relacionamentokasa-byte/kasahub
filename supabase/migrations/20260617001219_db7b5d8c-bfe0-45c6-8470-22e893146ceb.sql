
CREATE TABLE public.boletos_inter (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  nosso_numero TEXT,
  codigo_solicitacao TEXT NOT NULL UNIQUE,
  seu_numero TEXT,
  situacao TEXT NOT NULL DEFAULT 'EM_PROCESSAMENTO',
  valor_nominal NUMERIC(14,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  pdf_path TEXT,
  linha_digitavel TEXT,
  codigo_barras TEXT,
  pix_copia_cola TEXT,
  pix_txid TEXT,
  emitido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  pago_em TIMESTAMPTZ,
  cancelado_em TIMESTAMPTZ,
  motivo_cancelamento TEXT,
  raw JSONB,
  owner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.boletos_inter TO authenticated;
GRANT ALL ON public.boletos_inter TO service_role;

ALTER TABLE public.boletos_inter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view boletos"
  ON public.boletos_inter FOR SELECT
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can insert boletos"
  ON public.boletos_inter FOR INSERT
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can update boletos"
  ON public.boletos_inter FOR UPDATE
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can delete boletos"
  ON public.boletos_inter FOR DELETE
  USING (public.is_team_member(auth.uid()));

CREATE INDEX idx_boletos_inter_transaction ON public.boletos_inter(transaction_id);
CREATE INDEX idx_boletos_inter_client ON public.boletos_inter(client_id);
CREATE INDEX idx_boletos_inter_situacao ON public.boletos_inter(situacao);

CREATE TRIGGER update_boletos_inter_updated_at
  BEFORE UPDATE ON public.boletos_inter
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
