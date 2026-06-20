import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchProposal, 
  updateProposal, 
  formatCurrency,
  type Proposal,
} from "@/lib/crm-api";
import { fetchContractTemplates } from "@/lib/contracts-api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  FileText,
  DollarSign,
  Calendar,
  Layers,
  Rocket,
  ExternalLink,
  Copy,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { ScopeEditor } from "./ScopeEditor";
import { cn } from "@/lib/utils";
import { ProposalApprovalDialog } from "./ProposalApprovalDialog";
import { ProposalSignatureCard } from "./ProposalSignatureCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export function ProposalEditorContent({ proposalId }: { proposalId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Proposal>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);

  const { data: proposal, isLoading: isLoadingProposal } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => fetchProposal(proposalId),
  });

  const { data: contractTemplates = [] } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: fetchContractTemplates,
  });

  useEffect(() => {
    if (proposal) {
      setForm(proposal);
    }
  }, [proposal]);

  const updateMut = useMutation({
    mutationFn: (patch: Partial<Proposal>) => updateProposal(proposalId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposal", proposalId] });
      qc.invalidateQueries({ queryKey: ["propostas"] });
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Alterações salvas");
      setIsDirty(false);
    },
    onError: (e: Error) => toast.error(`Erro ao salvar: ${e.message}`),
  });

  const handleSave = () => {
    // Calculate total before saving
    const monthly = Number(form.monthly_investment || 0);
    const months = Number(form.recurring_months || 0);
    const setup = Number(form.one_time_investment || 0);
    const total = (monthly * months) + setup;

    // Sincroniza o snapshot do contrato com o modelo selecionado.
    // A página pública renderiza `contract_content` (cópia), não busca pelo template_id.
    const templateId = (form as any).contract_template_id;
    const selectedTemplate = templateId
      ? contractTemplates.find((t) => t.id === templateId)
      : null;
    const contract_content = selectedTemplate ? selectedTemplate.content : null;

    const payload = { ...form, total, contract_content };

    (document.activeElement as HTMLElement)?.blur();
    updateMut.mutate(payload);
  };

  if (isLoadingProposal) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/proposta/${proposal?.public_token}`;

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link público copiado!");
  };

  const handleApprove = () => {
    if (isDirty) {
      toast.error("Salve as alterações antes de aprovar.");
      return;
    }
    setIsApprovalDialogOpen(true);
  };

  return (
    <div className="space-y-8 animate-reveal">
      {/* Signature / Acceptance Card */}
      <ProposalSignatureCard
        status={form.status}
        signatureClient={(form as any).signature_client}
        clientSignatureData={(form as any).client_signature_data}
        acceptedName={(form as any).accepted_name}
        acceptedAt={(form as any).accepted_at}
        signedAtClient={(form as any).signed_at_client}
        acceptedIp={(form as any).accepted_ip}
        clientSignedEmail={(form as any).client_signed_email}
        clientEmail={form.client_email}
        clientName={form.client_name}
        externalSignatureUrl={(form as any).external_signature_url}
        externalSignatureFilename={(form as any).external_signature_filename}
      />

      {/* Status Banner */}
      <div className="flex items-center justify-between bg-surface border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground/50">Status Atual:</span>
          <Badge className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border-none", 
            form.status === "Rascunho" ? "bg-gray-200 text-gray-800" :
            form.status === "Enviada" ? "bg-blue-100 text-blue-800" :
            form.status === "Aprovada" ? "bg-green-100 text-green-800" :
            form.status === "Recusada" ? "bg-red-100 text-red-800" :
            form.status === "Encerrada" ? "bg-slate-700 text-white" : ""
          )}>
            {form.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-foreground/50">Alterar Status:</Label>
          <Select
            value={form.status}
            onValueChange={async (val) => {
              const oldStatus = form.status;
              const newStatus = val;

              // Se a proposta estava Aprovada e o novo status NÃO é Aprovada, reverter
              if (oldStatus === "Aprovada" && newStatus !== "Aprovada") {
                const confirmed = window.confirm(
                  "Você está revertendo uma proposta que já foi aprovada. " +
                  "Isso removerá automaticamente o Projeto, o Contrato e todos os lançamentos financeiros vinculados. " +
                  "Deseja continuar?"
                );

                if (!confirmed) return;

                const { revertProposalApproval } = await import("@/lib/proposal-approval");
                
                toast.promise(
                  revertProposalApproval(supabase, proposalId, { reopen: newStatus === "Rascunho" }),
                  {
                    loading: "Revertendo aprovação e removendo dados vinculados...",
                    success: () => {
                      qc.invalidateQueries({ queryKey: ["proposal", proposalId] });
                      qc.invalidateQueries({ queryKey: ["client-contracts"] });
                      qc.invalidateQueries({ queryKey: ["client-projects"] });
                      qc.invalidateQueries({ queryKey: ["client-transactions"] });
                      qc.invalidateQueries({ queryKey: ["proposals"] });
                      qc.invalidateQueries({ queryKey: ["contracts"] });
                      qc.invalidateQueries({ queryKey: ["projects"] });
                      qc.invalidateQueries({ queryKey: ["transactions"] });
                      setForm({ ...form, status: newStatus });
                      return "Status revertido. O projeto e o financeiro vinculados foram removidos.";
                    },
                    error: (err) => {
                      console.error(`[DEBUG] Erro ao reverter status para "${newStatus}":`, err);
                      return `Erro ao reverter: ${err.message}`;
                    }
                  }
                );
              } else {
                setForm({ ...form, status: newStatus });
                setIsDirty(true);
              }
            }}
          >
            <SelectTrigger className="w-[180px] h-9 rounded-full bg-surface border-border">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Rascunho">Rascunho</SelectItem>
              <SelectItem value="Enviada">Enviada</SelectItem>
              <SelectItem
                value="Aprovada"
                className="text-green-600 font-semibold"
                disabled={form.status === "Aprovada" || !(form.signature_client || (form as any).client_signature_data)}
              >
                Aprovada {!(form.signature_client || (form as any).client_signature_data) ? "(requer assinatura do cliente)" : ""}
              </SelectItem>
              <SelectItem value="Recusada" className="text-red-600 font-semibold">Recusada</SelectItem>
              <SelectItem value="Encerrada">Encerrada</SelectItem>
              
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Header Info */}
      <section className="grid md:grid-cols-2 gap-6 bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="size-4" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Identificação</h3>
          </div>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Título da Proposta</Label>
              <Input 
                value={form.title || ""} 
                onChange={e => { setForm({ ...form, title: e.target.value }); setIsDirty(true); }}
                placeholder="Ex: Consultoria Mensal 2024"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome do Cliente</Label>
                <Input value={form.client_name || ""} disabled className="bg-muted/50" />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input value={form.client_email || ""} disabled className="bg-muted/50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Modelo de Contrato</Label>
              <Select
                value={(form as any).contract_template_id || "__none__"}
                onValueChange={(val) => {
                  setForm({ ...form, contract_template_id: val === "__none__" ? null : val } as any);
                  setIsDirty(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modelo jurídico..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum modelo</SelectItem>
                  {contractTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Modelo usado para gerar o contrato quando a proposta for aprovada.
              </p>
            </div>
          </div>
        </div>


        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Calendar className="size-4" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Prazos e Validade</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Válido até</Label>
              <Input 
                type="date" 
                value={form.valid_until || ""} 
                onChange={e => { setForm({ ...form, valid_until: e.target.value }); setIsDirty(true); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data do 1º Vencimento</Label>
              <Input 
                type="date" 
                value={form.first_due_date || ""} 
                onChange={e => { setForm({ ...form, first_due_date: e.target.value }); setIsDirty(true); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data de Início do Serviço</Label>
              <Input
                type="date"
                value={(form as any).service_start_date || ""}
                onChange={e => { setForm({ ...form, service_start_date: e.target.value } as any); setIsDirty(true); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dia de Cobrança</Label>
              <Select
                value={(form as any).billing_day ? String((form as any).billing_day) : ""}
                onValueChange={(v) => {
                  setForm({ ...form, billing_day: Number(v) } as any);
                  setIsDirty(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o dia" />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20, 25].map((d) => (
                    <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Datas padrão de cobrança da empresa: 5, 10, 15, 20 e 25.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Investment Section Refactored */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <DollarSign className="size-4" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Investimento e Contrato</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
              <div className="space-y-4">
                <Label className="text-sm font-semibold">Duração do Contrato</Label>
                <RadioGroup 
                  value={String(form.recurring_months || "6")} 
                  onValueChange={val => {
                    setForm({ ...form, recurring_months: Number(val), contract_type: "recurring" });
                    setIsDirty(true);
                  }}
                  className="flex flex-wrap gap-3"
                >
                  {[3, 6, 12].map((months) => (
                    <div key={months} className="flex items-center">
                      <RadioGroupItem value={String(months)} id={`r-${months}`} className="sr-only" />
                      <Label
                        htmlFor={`r-${months}`}
                        className={cn(
                          "px-6 py-2.5 rounded-full border border-border cursor-pointer transition-all font-medium text-sm",
                          form.recurring_months === months 
                            ? "bg-[#FFBC45] border-[#FFBC45] text-black shadow-md scale-105" 
                            : "bg-surface hover:bg-muted"
                        )}
                      >
                        {months} meses
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Valor Mensal (Fee)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input 
                      type="number"
                      placeholder="0,00"
                      className="pl-10"
                      value={form.monthly_investment || ""}
                      onChange={e => {
                        setForm({ ...form, monthly_investment: Number(e.target.value) });
                        setIsDirty(true);
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Setup / Investimento Único</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input 
                      type="number"
                      placeholder="0,00"
                      className="pl-10"
                      value={form.one_time_investment || ""}
                      onChange={e => {
                        setForm({ ...form, one_time_investment: Number(e.target.value) });
                        setIsDirty(true);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-center space-y-4">
            <div className="text-center space-y-1">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Resumo do Contrato</span>
              <div className="text-3xl font-bold text-primary">
                {formatCurrency((Number(form.monthly_investment || 0) * Number(form.recurring_months || 0)) + Number(form.one_time_investment || 0))}
              </div>
              <p className="text-xs text-muted-foreground">Valor total do investimento</p>
            </div>
            
            <div className="pt-4 border-t border-border space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mensalidade:</span>
                <span className="font-medium">{formatCurrency(form.monthly_investment || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duração:</span>
                <span className="font-medium">{form.recurring_months || 0} meses</span>
              </div>
              {Number(form.one_time_investment || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Setup:</span>
                  <span className="font-medium">{formatCurrency(form.one_time_investment || 0)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Scope & Notes */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Layers className="size-4" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Escopo de Trabalho</h3>
          </div>
          <div className="bg-transparent">
            <ScopeEditor 
              value={form.scope || ""} 
              onChange={v => { setForm({ ...form, scope: v }); setIsDirty(true); }} 

            />
          </div>

        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="size-4" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Observações Internas</h3>
          </div>
          <Textarea 
            value={form.notes || ""} 
            onChange={e => { setForm({ ...form, notes: e.target.value }); setIsDirty(true); }}
            placeholder="Notas adicionais sobre negociação, descontos ou condições especiais..."
            className="min-h-[200px] bg-surface border-border rounded-2xl p-4 shadow-sm"
          />
        </div>
      </section>

      {/* Actions */}
      <div className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 flex items-center gap-3 z-50">
        {form.status !== "Aprovada" ? (
          <>
            <Button 
              onClick={handleSave} 
              disabled={!isDirty || updateMut.isPending}
              className={cn(
                "rounded-full h-12 px-8 font-bold shadow-xl transition-all",
                isDirty ? "bg-primary text-primary-foreground hover:scale-105" : "bg-muted text-muted-foreground"
              )}
            >
              {updateMut.isPending ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5 mr-2" />}
              Salvar Alterações
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={copyPublicLink}
                className="rounded-full h-12 px-6 font-semibold bg-surface border-border shadow-lg hover:bg-muted transition-all"
              >
                <Copy className="size-4 mr-2" />
                Link Público
              </Button>

              <Button
                onClick={handleApprove}
                className="rounded-full h-12 px-8 font-bold bg-[#FFBC45] text-black hover:bg-[#FFBC45]/90 shadow-xl transition-all hover:scale-105"
              >
                <Rocket className="size-5 mr-2" />
                Aprovar / Converter
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={copyPublicLink}
              className="rounded-full h-12 px-6 font-semibold bg-surface border-border shadow-lg hover:bg-muted transition-all"
            >
              <Copy className="size-4 mr-2" />
              Link Público
            </Button>

            <Button
              variant="destructive"
              onClick={async () => {
                const confirmed = window.confirm(
                  "Você está cancelando uma proposta que já foi aprovada. " +
                  "Isso removerá automaticamente o Projeto, o Contrato e todos os lançamentos financeiros vinculados. " +
                  "Deseja continuar?"
                );

                if (!confirmed) return;

                const { revertProposalApproval } = await import("@/lib/proposal-approval");
                
                toast.promise(
                  revertProposalApproval(supabase, proposalId, { reopen: false }),
                  {
                    loading: "Cancelando proposta e removendo dados vinculados...",
                    success: () => {
                      qc.invalidateQueries({ queryKey: ["proposal", proposalId] });
                      qc.invalidateQueries({ queryKey: ["client-contracts"] });
                      qc.invalidateQueries({ queryKey: ["client-projects"] });
                      qc.invalidateQueries({ queryKey: ["client-transactions"] });
                      qc.invalidateQueries({ queryKey: ["proposals"] });
                      qc.invalidateQueries({ queryKey: ["contracts"] });
                      qc.invalidateQueries({ queryKey: ["projects"] });
                      qc.invalidateQueries({ queryKey: ["transactions"] });
                      return "Proposta cancelada. O projeto e o financeiro vinculados foram removidos.";
                    },
                    error: (err) => `Erro ao cancelar: ${err.message}`
                  }
                );
              }}
              className="rounded-full h-12 px-8 font-bold shadow-xl transition-all hover:scale-105"
            >
              <Trash2 className="size-5 mr-2" />
              Cancelar Proposta
            </Button>
          </div>
        )}
      </div>

      <ProposalApprovalDialog 
        proposalId={proposalId}
        open={isApprovalDialogOpen}
        onOpenChange={setIsApprovalDialogOpen}
      />
    </div>
  );
}
