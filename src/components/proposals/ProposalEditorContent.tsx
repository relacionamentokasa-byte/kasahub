import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchProposal, 
  fetchProposalItems, 
  updateProposal, 
  upsertProposalItem, 
  deleteProposalItem,
  recalcProposalTotals,
  formatCurrency,
  type Proposal,
  type ProposalItem
} from "@/lib/crm-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);

  const { data: proposal, isLoading: isLoadingProposal } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => fetchProposal(proposalId),
  });

  const { data: proposalItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ["proposal-items", proposalId],
    queryFn: () => fetchProposalItems(proposalId),
  });

  useEffect(() => {
    if (proposal) {
      setForm(proposal);
    }
  }, [proposal]);

  useEffect(() => {
    if (proposalItems) {
      setItems(proposalItems);
    }
  }, [proposalItems]);

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

  const itemMut = useMutation({
    mutationFn: (item: Partial<ProposalItem> & { title: string }) => 
      upsertProposalItem({ ...item, proposal_id: proposalId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposal-items", proposalId] });
      persistTotals();
    },
  });

  const delItemMut = useMutation({
    mutationFn: (id: string) => deleteProposalItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposal-items", proposalId] });
      persistTotals();
    },
  });

  const persistTotals = () => {
    const totals = recalcProposalTotals(items);
    updateMut.mutate(totals);
  };

  const handleSave = () => {
    // Force blur to ensure last edits are captured if needed
    (document.activeElement as HTMLElement)?.blur();
    updateMut.mutate(form);
  };

  const addItem = () => {
    itemMut.mutate({
      title: "Novo Serviço",
      quantity: 1,
      unit_price: 0,
      recurrence: form.contract_type === "recurring" ? "monthly" : "one_time",
      order_index: items.length,
    });
  };

  if (isLoadingProposal || isLoadingItems) {
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

      {/* Services/Items */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <DollarSign className="size-4" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Itens e Investimento</h3>
          </div>
          <Button size="sm" variant="outline" onClick={addItem} className="h-8 rounded-full">
            <Plus className="size-3.5 mr-1.5" /> Adicionar Item
          </Button>
        </div>

        <div className="border border-border rounded-2xl overflow-hidden bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left py-3 px-4 font-mono-kasa text-[10px] uppercase tracking-wider">Serviço / Descrição</th>
                <th className="text-center py-3 px-2 font-mono-kasa text-[10px] uppercase tracking-wider w-20">Qtd</th>
                <th className="text-right py-3 px-2 font-mono-kasa text-[10px] uppercase tracking-wider w-32">Preço Unit.</th>
                <th className="text-center py-3 px-2 font-mono-kasa text-[10px] uppercase tracking-wider w-28">Recorrência</th>
                <th className="text-right py-3 px-4 font-mono-kasa text-[10px] uppercase tracking-wider w-32">Subtotal</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="group hover:bg-muted/10 transition-colors">
                  <td className="py-3 px-4">
                    <Input 
                      value={item.title} 

                      onChange={e => {
                        const newItems = items.map(it => it.id === item.id ? { ...it, title: e.target.value } : it);
                        setItems(newItems);
                      }}
                      onBlur={() => itemMut.mutate({ id: item.id, title: item.title })}
                      className="h-8 p-0 border-transparent bg-transparent font-medium focus-visible:ring-0"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <Input 
                      type="number" 
                      value={item.quantity} 
                      onChange={e => {
                        const val = Number(e.target.value);
                        const newItems = items.map(it => it.id === item.id ? { ...it, quantity: val } : it);
                        setItems(newItems);
                      }}
                      onBlur={() => itemMut.mutate({ id: item.id, title: item.title, quantity: item.quantity })}
                      className="h-8 text-center bg-transparent border-transparent focus-visible:ring-0"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <Input 
                      type="number" 
                      value={item.unit_price} 
                      onChange={e => {
                        const val = Number(e.target.value);
                        const newItems = items.map(it => it.id === item.id ? { ...it, unit_price: val } : it);
                        setItems(newItems);
                      }}
                      onBlur={() => itemMut.mutate({ id: item.id, title: item.title, unit_price: item.unit_price })}
                      className="h-8 text-right bg-transparent border-transparent focus-visible:ring-0"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <select 
                      value={item.recurrence || "one_time"}
                      onChange={e => {
                        const val = e.target.value;
                        const newItems = items.map(it => it.id === item.id ? { ...it, recurrence: val } : it);
                        setItems(newItems);
                        itemMut.mutate({ id: item.id, title: item.title, recurrence: val });
                      }}
                      className="h-8 w-full bg-transparent border-none text-center text-xs focus:ring-0 cursor-pointer"
                    >
                      <option value="one_time">Único</option>
                      <option value="monthly">Mensal</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">
                    {formatCurrency(Number(item.quantity) * Number(item.unit_price))}
                  </td>
                  <td className="py-3 pr-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => delItemMut.mutate(item.id)}
                      className="h-7 w-7 text-destructive/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-foreground/30 italic">Nenhum item adicionado.</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-muted/50 border-t border-border">
              <tr>
                <td colSpan={4} className="py-3 px-4 text-right font-mono-kasa text-[10px] uppercase tracking-wider text-foreground/50">Investimento Mensal</td>
                <td className="py-3 px-4 text-right font-bold text-primary">{formatCurrency(form.monthly_investment || 0)}</td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={4} className="py-3 px-4 text-right font-mono-kasa text-[10px] uppercase tracking-wider text-foreground/50">Investimento Único</td>
                <td className="py-3 px-4 text-right font-bold">{formatCurrency(form.one_time_investment || 0)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
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
