import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, FileSignature, Loader2, User, Coins, Calendar, FileText, ScrollText, AlertCircle } from "lucide-react";
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
      try {
        if (!proposalId || !proposal) throw new Error("Proposta inválida");
        
        const clientId = proposal.client_id;
        if (!clientId) throw new Error("Cliente não vinculado à proposta.");

        // PASSO A: Atualizar Status da Proposta
        const { error: upErr } = await supabase
          .from("proposals")
          .update({ 
            status: "Aprovada",
            accepted_at: new Date().toISOString(),
            converted_at: new Date().toISOString(),
          })
          .eq("id", proposalId);
        
        if (upErr) throw upErr;

        // PASSO B: Criar Job (Tabela projects)
        const { data: job, error: jobErr } = await supabase
          .from("projects")
          .insert({
            name: proposal.title,
            client_id: clientId,
            proposal_id: proposalId,
            status: "active",
            type: "automatic"
          })
          .select("id")
          .single();
        
        if (jobErr) throw jobErr;

        // PASSO C: Financeiro (O Básico que Funciona)
        const monthly = Number(proposal.monthly_investment || 0);
        const setup = Number(proposal.one_time_investment || 0);
        const firstDue = proposal.first_due_date || new Date().toISOString().split('T')[0];
        
        let months = Number(proposal.recurring_months || 0);
        if (!months) {
          if (proposal.contract_term === "monthly") months = 1;
          else if (proposal.contract_term?.includes("_months")) months = Number(proposal.contract_term.replace("_months", ""));
          else if (monthly > 0) months = 12;
        }

        const transactions: any[] = [];
        const [fy, fm, fd] = firstDue.split("-").map(Number);

        // Loop para parcelas mensais
        if (monthly > 0 && months > 0) {
          for (let i = 0; i < months; i++) {
            const due = new Date(fy, fm - 1 + i, fd);
            transactions.push({
              description: `Mensalidade: ${proposal.title} (${i + 1}/${months})`,
              amount: monthly,
              due_date: due.toISOString().split('T')[0],
              status: "pending",
              client_id: clientId,
              proposal_id: proposalId
            });
          }
        }

        // Setup único
        if (setup > 0) {
          transactions.push({
            description: `Setup / Ativação: ${proposal.title}`,
            amount: setup,
            due_date: firstDue,
            status: "pending",
            client_id: clientId,
            proposal_id: proposalId
          });
        }

        if (transactions.length > 0) {
          const { error: txErr } = await supabase.from("transactions").insert(transactions);
          if (txErr) throw txErr;
        }

        return { client_id: clientId };
      } catch (err: any) {
        console.error("Erro na aprovação:", err);
        throw err;
      }
    },
    onSuccess: (data) => {
      toast.success("Proposta Aprovada com Sucesso!");
      qc.invalidateQueries();
      onOpenChange(false);
      setSignature("");
      onApproved?.();
      navigate({ to: `/clientes/${data.client_id}` });
    },
    onError: (e: Error) => {
      toast.error(`Erro crítico: ${e.message}`);
    },
  });

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
                  <div className="mt-2 rounded-md border border-border bg-green-500/5 h-20 flex flex-col items-center justify-center text-center p-2">
                    <span className="text-sm font-medium text-green-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-4" /> Proposta Assinada
                    </span>
                    <span className="text-[10px] text-foreground/60 mt-1">{proposal.signature_client}</span>
                    {proposal.signed_at_client && (
                      <span className="text-[8px] text-foreground/40 italic">
                        em {new Date(proposal.signed_at_client).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 rounded-md border border-dashed border-destructive bg-destructive/5 h-20 flex flex-col items-center justify-center text-center p-3">
                    <span className="text-sm font-bold text-destructive flex items-center gap-1.5">
                      <AlertCircle className="size-4" /> Assinatura Obrigatória
                    </span>
                    <p className="text-[10px] text-foreground/70 mt-1 font-medium">
                      O bloqueio é definitivo. O cliente deve obrigatoriamente assinar pelo link público para liberar a conversão.
                    </p>
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
            disabled={approveMut.isPending || !proposal}
            className="bg-green-600 text-white hover:bg-green-700 gap-2"
          >
            {approveMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Aprovar Proposta
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
