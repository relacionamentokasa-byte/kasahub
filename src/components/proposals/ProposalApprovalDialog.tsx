import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, FileSignature, Loader2, User, Coins, Calendar, FileText, ScrollText, AlertCircle, Upload, Paperclip, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchProposal, fetchProposalItems, formatCurrency } from "@/lib/crm-api";
import { approveProposal } from "@/lib/proposal-approval";
import { useNavigate } from "@tanstack/react-router";
import { ScopeRenderer } from "@/components/proposals/ScopeRenderer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  proposalId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved?: () => void;
}

export function ProposalApprovalDialog({ proposalId, open, onOpenChange, onApproved }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [signature, setSignature] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingExt, setUploadingExt] = useState(false);

  const { data: proposal } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => fetchProposal(proposalId!),
    enabled: !!proposalId && open,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["proposal", proposalId, "items"],
    queryFn: () => fetchProposalItems(proposalId!),
    enabled: !!proposalId && open,
  });

  const { data: agency } = useQuery({
    queryKey: ["agency_settings_min"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agency_settings")
        .select("name, agency_signature_url")
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: open,
  });

  const total = useMemo(() => Number(proposal?.total ?? 0), [proposal]);
  const monthly = useMemo(() => Number(proposal?.monthly_investment ?? 0), [proposal]);
  const oneTime = useMemo(() => Number(proposal?.one_time_investment ?? 0), [proposal]);

  const approveMut = useMutation({
    mutationFn: async (options: { internalApproval?: boolean } = {}) => {
      if (!proposalId || !proposal) throw new Error("Proposta inválida");
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      const result = await approveProposal(supabase, proposalId, {
        internalApproval: options.internalApproval,
        internalApprovalBy: user.id,
        acceptedName: profile?.full_name || user.email,
      });

      return result;
    },
      onSuccess: (data) => {
        // Fecha o modal ANTES de invalidar/navegar para evitar re-render em loop.
        onOpenChange(false);
        setSignature("");
        toast.success("Proposta Aprovada com Sucesso!");
        // Invalida apenas as queries essenciais — evita cascata de refetches.
        qc.invalidateQueries({ queryKey: ["propostas"] });
        qc.invalidateQueries({ queryKey: ["proposals"] });
        qc.invalidateQueries({ queryKey: ["projects"] });
        qc.invalidateQueries({ queryKey: ["transactions"] });
        qc.invalidateQueries({ queryKey: ["saude-negocio"] });
        qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
        onApproved?.();
        // Redireciona o usuário (desmonta o editor e quebra qualquer loop residual).
        navigate({ to: `/clientes/${data.client_id}` });
      },
    onError: (e: Error) => {
      toast.error(`Erro crítico: ${e.message}`);
    },
  });

  async function handleExternalUpload(file: File) {
    if (!proposalId) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 20MB).");
      return;
    }
    setUploadingExt(true);
    try {
      const ext = file.name.split(".").pop() || "pdf";
      const path = `external/${proposalId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("signatures")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("signatures")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      const url = signed?.signedUrl;
      if (!url) throw new Error("Falha ao gerar URL do anexo.");

      const { error: updErr } = await supabase
        .from("proposals")
        .update({
          external_signature_url: url,
          external_signature_filename: file.name,
          signature_client: "Assinado externamente (importado)",
          signed_at_client: new Date().toISOString(),
        })
        .eq("id", proposalId);
      if (updErr) throw updErr;

      toast.success("Comprovante de assinatura externa anexado.");
      qc.invalidateQueries({ queryKey: ["proposal", proposalId] });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao anexar comprovante.");
    } finally {
      setUploadingExt(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="size-5 text-primary" /> Aprovação de Proposta
          </DialogTitle>
          <DialogDescription>
            Revise todos os dados e assine para converter em contrato.
          </DialogDescription>
        </DialogHeader>

        {!proposal ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5">
            <Section icon={<User className="size-4" />} title="Cliente">
              <div className="text-sm space-y-1">
                <div className="font-medium">{proposal.client_name || "—"}</div>
                {proposal.client_email && <div className="text-foreground/60">{proposal.client_email}</div>}
              </div>
            </Section>

            <Section icon={<ScrollText className="size-4" />} title="Escopo">
              {(proposal as any).scope_text || (proposal as any).scope ? (
                <ScopeRenderer text={(proposal as any).scope_text || (proposal as any).scope} />

              ) : items.length ? (
                <ul className="text-sm space-y-1.5">
                  {items.map((it) => (
                    <li key={it.id} className="flex justify-between gap-3 border-b border-border/40 pb-1">
                      <span>{it.title}</span>
                      <span className="text-foreground/60">
                        {it.quantity}× {formatCurrency(Number(it.unit_price))} {it.recurrence === "monthly" ? "/mês" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-foreground/50">Sem escopo definido.</p>
              )}
            </Section>

            <Section icon={<Coins className="size-4" />} title="Investimento">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Stat label="Mensal" value={formatCurrency(monthly)} />
                <Stat label="Único" value={formatCurrency(oneTime)} />
                <Stat label="Total" value={formatCurrency(total)} highlight />
              </div>
            </Section>

            <Section icon={<Calendar className="size-4" />} title="Prazo & Cobrança">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Stat label="Tipo" value={proposal.contract_type === "recurring" ? "Recorrente" : "Pontual"} />
                <Stat 
                  label="Prazo" 
                  value={
                    proposal.contract_term === "indeterminado" 
                      ? "Indeterminado" 
                      : proposal.contract_term === "monthly"
                        ? "Mensal"
                        : proposal.contract_term?.includes("_months")
                          ? `${proposal.contract_term.replace("_months", "")} meses`
                          : `${proposal.recurring_months || 12} meses`
                  } 
                />
                <Stat 
                  label="Parcelas" 
                  value={
                    proposal.contract_type === "recurring"
                      ? (proposal.contract_term === "indeterminado" ? "1 (inicial)" : 
                         proposal.contract_term === "monthly" ? "1" :
                         proposal.contract_term?.includes("_months") ? proposal.contract_term.replace("_months", "") :
                         String(proposal.recurring_months || 12))
                      : String(proposal.installments || 1)
                  } 
                />
                <Stat label="Dia Cobrança" value={String((proposal as any).billing_day ?? "5")} />
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100 flex items-start gap-2">
                <AlertCircle className="size-4 text-blue-600 mt-0.5" />
                <div className="text-[11px] text-blue-800 leading-relaxed">
                  <strong>Confirmação de Geração Financeira:</strong> Ao aprovar, o sistema gerará automaticamente os lançamentos financeiros vinculados ao contrato com base no prazo e parcelas acima. 
                  {proposal.contract_term === "indeterminado" && " Para prazos indeterminados, apenas o primeiro vencimento será gerado."}
                </div>
              </div>
            </Section>

            {(proposal as any).contract_content && (
              <Section icon={<FileText className="size-4" />} title="Contrato Jurídico">
                <div
                  className="prose prose-sm max-w-none max-h-60 overflow-y-auto rounded-md border border-border bg-surface/50 p-3 text-foreground/80"
                  dangerouslySetInnerHTML={{ __html: String((proposal as any).contract_content) }}
                />
              </Section>
            )}

            <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border">
              <div>
                <Label className="text-xs uppercase text-foreground/60">Assinatura KASA HUB</Label>
                <div className="mt-2 rounded-md border border-border bg-surface/40 w-full h-20 flex items-center justify-center p-2">
                  {agency?.agency_signature_url ? (
                    <img src={agency.agency_signature_url} alt="Assinatura KASA HUB" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs text-foreground/50 italic">{agency?.name ?? "KASA HUB"}</span>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase text-foreground/60">
                  Assinatura do Cliente
                </Label>
                {proposal.signature_client ? (
                  <div className="mt-2 rounded-md border border-border bg-green-500/5 min-h-20 flex flex-col items-center justify-center text-center p-2">
                    <span className="text-sm font-medium text-green-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-4" /> Proposta Assinada
                    </span>
                    <span className="text-[10px] text-foreground/60 mt-1">{proposal.signature_client}</span>
                    {proposal.signed_at_client && (
                      <span className="text-[8px] text-foreground/40 italic">
                        em {new Date(proposal.signed_at_client).toLocaleString('pt-BR')}
                      </span>
                    )}
                    {(proposal as any).external_signature_url && (
                      <a
                        href={(proposal as any).external_signature_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary underline"
                      >
                        <Paperclip className="size-3" />
                        {(proposal as any).external_signature_filename || "Ver comprovante"}
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 rounded-md border border-dashed border-destructive bg-destructive/5 min-h-20 flex flex-col items-center justify-center text-center p-3 gap-2">
                    <span className="text-sm font-bold text-destructive flex items-center gap-1.5">
                      <AlertCircle className="size-4" /> Assinatura Obrigatória
                    </span>
                    <p className="text-[10px] text-foreground/70 font-medium">
                      O cliente deve assinar pelo link público — ou anexe o comprovante de assinatura externa (Operand, contrato em PDF, etc).
                    </p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleExternalUpload(f);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploadingExt}
                    >
                      {uploadingExt ? <Loader2 className="size-3 animate-spin mr-1" /> : <Upload className="size-3 mr-1" />}
                      Assinado externamente — anexar comprovante
                    </Button>
                  </div>
                )}
              </div>

            </div>


            <Badge className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border-none", 
              proposal.status === "Rascunho" ? "bg-gray-200 text-gray-800" :
              proposal.status === "Enviada" ? "bg-blue-100 text-blue-800" :
              proposal.status === "Aprovada" ? "bg-green-100 text-green-800" :
              proposal.status === "Recusada" ? "bg-red-100 text-red-800" :
              proposal.status === "Encerrada" ? "bg-slate-700 text-white" : ""
            )}>
              {proposal.status}
            </Badge>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => approveMut.mutate({ internalApproval: true })}
            disabled={
              approveMut.isPending ||
              !proposal ||
              !(proposal.signature_client || (proposal as any).client_signature_data)
            }
            className="bg-green-600 text-white hover:bg-green-700 gap-2"
          >
            {approveMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {proposal && !(proposal.signature_client || (proposal as any).client_signature_data)
              ? "Aguardando Assinatura do Cliente"
              : "Aprovar Proposta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface/30 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-3">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-foreground/50">{label}</div>
      <div className={`font-medium ${highlight ? "text-primary text-lg" : ""}`}>{value}</div>
    </div>
  );
}
