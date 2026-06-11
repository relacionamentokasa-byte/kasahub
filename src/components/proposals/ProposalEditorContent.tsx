import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchProposal, 
  updateProposal, 
  formatCurrency,
  type Proposal,
} from "@/lib/crm-api";
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

export function ProposalEditorContent({ proposalId }: { proposalId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Proposal>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);

  const { data: proposal, isLoading: isLoadingProposal } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => fetchProposal(proposalId),
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
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta salva com sucesso");
      setIsDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSave = () => {
    // Calculate total before saving
    const monthly = Number(form.monthly_investment || 0);
    const months = Number(form.recurring_months || 0);
    const setup = Number(form.one_time_investment || 0);
    const total = (monthly * months) + setup;

    const payload = { ...form, total };
    
    (document.activeElement as HTMLElement)?.blur();
    updateMut.mutate(payload);
  };

  const handleSave = () => {
    // Force blur to ensure last edits are captured if needed
    (document.activeElement as HTMLElement)?.blur();
    updateMut.mutate(form);
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
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Calendar className="size-4" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Prazos e Validade</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
            <ScopeEditor 
              value={form.scope || []} 
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
      </div>

      <ProposalApprovalDialog 
        proposalId={proposalId}
        open={isApprovalDialogOpen}
        onOpenChange={setIsApprovalDialogOpen}
      />
    </div>
  );
}
