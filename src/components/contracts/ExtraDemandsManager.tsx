import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, CheckCircle2, Clock, AlertCircle, Trash2, ExternalLink, Copy, Check, FileDown, MessageSquare, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchExtraDemands, createExtraDemand, approveExtraDemand, deleteExtraDemand, updateExtraDemand } from "@/lib/ops-api";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ExtraDemandsManager({ clientId, contractId: initialContractId }: { clientId: string; contractId?: string }) {
  const qc = useQueryClient();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newDme, setNewDme] = useState({
    title: "",
    description: "",
    value: 0,
    deadline_days: 3,
    is_billable: true,
    contract_id: initialContractId || "",
    origin: initialContractId ? "contract" : "contract", // Default to contract, but will show toggle
    status: "draft"
  });

  const { data: demands = [], isLoading } = useQuery({
    queryKey: ["extra-demands", { clientId, contractId: initialContractId }],
    queryFn: () => fetchExtraDemands({ clientId, contractId: initialContractId }),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("client_id", clientId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => createExtraDemand({ ...data, client_id: clientId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["extra-demands"] });
      toast.success("DME criada com sucesso");
      setIsNewOpen(false);
      setNewDme({ 
        title: "", 
        description: "", 
        value: 0, 
        deadline_days: 3, 
        is_billable: true, 
        contract_id: initialContractId || "",
        origin: initialContractId ? "contract" : "contract",
        status: "draft"
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveMut = useMutation({
    mutationFn: approveExtraDemand,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["extra-demands"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("DME aprovada e convertida!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteExtraDemand,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["extra-demands"] });
      toast.success("DME excluída");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": 
      case "aprovada":
        return <span className="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 font-bold uppercase tracking-wider"><CheckCircle2 className="size-3" /> Aprovada</span>;
      case "pending_approval": 
      case "aguardando_aprovação":
        return <span className="bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 font-bold uppercase tracking-wider"><Clock className="size-3" /> Aguardando Aprovação</span>;
      case "draft": 
      case "rascunho":
        return <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Rascunho</span>;
      case "in_production": 
      case "em_produção":
        return <span className="bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Em Produção</span>;
      case "completed": 
      case "concluída":
        return <span className="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Concluída</span>;
      case "cancelled": 
      case "cancelada":
        return <span className="bg-rose-500/15 text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Cancelada</span>;
      default: return <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{status}</span>;
    }
  };

  const getApprovalUrl = (token: string) => `${window.location.origin}/dme/${token}`;

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getApprovalUrl(token));
    toast.success("Link de aprovação copiado");
  };

  const shareWhatsApp = (dme: any) => {
    const url = getApprovalUrl(dme.public_token!);
    const text = `Olá! Segue o link para aprovação da Demanda Extra ${dme.number_display}: ${dme.title}\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (isLoading) return <div className="p-10 text-foreground/40 font-mono-kasa text-xs uppercase animate-pulse">Carregando DMEs...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-display font-bold text-lg">Demandas Extras (DME)</h4>
        <Button onClick={() => setIsNewOpen(true)} size="sm" className="gap-2">
          <Plus className="size-4" /> Nova Demanda Extra
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {demands.length === 0 ? (
          <div className="col-span-full text-center py-12 border border-dashed border-border rounded-2xl bg-surface/30">
            <div className="bg-muted/50 size-12 rounded-full grid place-items-center mx-auto mb-4">
              <FileText className="size-6 text-foreground/20" />
            </div>
            <p className="text-foreground/40 text-sm font-mono-kasa uppercase tracking-widest">Nenhuma demanda extra cadastrada.</p>
          </div>
        ) : (
          demands.map((dme) => {
            const contract = contracts.find(c => c.id === dme.contract_id);
            return (
              <div key={dme.id} className="bg-surface border border-border rounded-2xl p-5 flex flex-col justify-between group relative hover:border-primary/40 transition-all duration-300">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-primary font-mono-kasa tracking-tighter">{dme.number_display}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase font-bold text-foreground/30 tracking-widest px-1.5 py-0.5 rounded border border-border/40">
                        {(dme as any).origin === 'independent' ? 'Independente' : 'Contratual'}
                      </span>
                      {getStatusBadge(dme.status)}
                    </div>
                  </div>
                  <h5 className="font-display font-bold text-lg leading-tight mb-2 group-hover:text-primary transition-colors">{dme.title}</h5>
                  {contract ? (
                    <div className="text-[10px] text-foreground/40 flex items-center gap-1.5 uppercase font-bold tracking-widest mb-3">
                      <FileText className="size-3 text-primary" /> {contract.title}
                    </div>
                  ) : (
                    <div className="text-[10px] text-foreground/30 flex items-center gap-1.5 uppercase font-bold tracking-widest mb-3">
                      <FileText className="size-3 text-foreground/20" /> Sem contrato
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/40">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold text-foreground/30 tracking-widest">Valor</span>
                      <div className="text-sm font-bold font-mono-kasa">{BRL(Number(dme.value))}</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold text-foreground/30 tracking-widest">Prazo</span>
                      <div className="text-sm font-bold font-mono-kasa">{dme.deadline_days} Dias</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border/40">
                  {(dme.status === "pending_approval" || dme.status === "aguardando_aprovação") && (
                    <>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="size-9 rounded-xl border-border/60 hover:border-primary/40" onClick={() => copyLink(dme.public_token!)}>
                              <Copy className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copiar Link</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="size-9 rounded-xl border-border/60 hover:border-emerald-500/40 hover:text-emerald-500" onClick={() => shareWhatsApp(dme)}>
                              <MessageSquare className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Enviar WhatsApp</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="size-9 rounded-xl border-border/60 hover:border-primary/40" onClick={() => window.open(getApprovalUrl(dme.public_token!), "_blank")}>
                              <ExternalLink className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Visualizar Aprovação</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  )}
                  
                  {["draft", "rascunho", "pending_approval", "aguardando_aprovação"].includes(dme.status) && (
                    <Button variant="secondary" size="sm" className="h-9 flex-1 gap-2 font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-emerald-500 hover:text-white transition-all" onClick={() => approveMut.mutate(dme.id)}>
                      <Check className="size-4" /> Aprovar
                    </Button>
                  )}
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-9 rounded-xl text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 ml-auto" onClick={() => deleteMut.mutate(dme.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Excluir DME</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-md bg-surface border-border p-0 overflow-hidden rounded-3xl">
          <div className="p-6 pb-2">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl font-bold tracking-tight">Nova Demanda Extra</DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="p-6 pt-2 space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-foreground/50">Origem da Demanda *</Label>
              <Select 
                value={newDme.origin} 
                onValueChange={(v: "contract" | "independent") => setNewDme({ 
                  ...newDme, 
                  origin: v,
                  contract_id: v === "independent" ? "" : newDme.contract_id 
                })}
              >
                <SelectTrigger className="bg-background border-border/60 h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Vinculada ao Contrato</SelectItem>
                  <SelectItem value="independent">Independente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newDme.origin === "contract" && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-foreground/50">Contrato *</Label>
                <Select 
                  value={newDme.contract_id} 
                  onValueChange={(v) => setNewDme({ ...newDme, contract_id: v })}
                  disabled={!!initialContractId}
                >
                  <SelectTrigger className="bg-background border-border/60 h-11 rounded-xl">
                    <SelectValue placeholder="Selecione o contrato..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-foreground/50">Título da Demanda</Label>
              <Input 
                value={newDme.title} 
                onChange={(e) => setNewDme({ ...newDme, title: e.target.value })} 
                placeholder="Ex: Arte para Outdoor Campanha 2024"
                className="bg-background border-border/60 h-11 rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-foreground/50">Descrição Detalhada</Label>
              <Textarea 
                value={newDme.description} 
                onChange={(e) => setNewDme({ ...newDme, description: e.target.value })} 
                placeholder="Descreva as especificações técnicas, referências e entregáveis..." 
                className="bg-background border-border/60 rounded-xl min-h-[100px] resize-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-foreground/50">Valor (R$)</Label>
                  <Input 
                    type="number" 
                    value={newDme.value} 
                    onChange={(e) => setNewDme({ ...newDme, value: Number(e.target.value) })}
                    className="bg-background border-border/60 h-11 rounded-xl font-mono-kasa"
                  />
                  {newDme.origin === "independent" && newDme.value >= 1000 && !(newDme as any).conversion_alert_dismissed && (
                    <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                      <p className="text-[10px] text-amber-200 leading-tight flex items-center gap-1.5 font-bold uppercase">
                        <AlertCircle className="size-3" /> Demanda de Valor Elevado
                      </p>
                      <p className="text-[10px] text-foreground/60 leading-tight">
                        Esta demanda possui valor elevado (R$ 1.000+). Deseja converter esta demanda em uma Proposta Comercial?
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-7 text-[9px] font-bold uppercase px-2" onClick={() => toast.info("Funcionalidade de conversão será implementada em breve.")}>Converter em Proposta</Button>
                        <Button variant="ghost" size="sm" className="h-7 text-[9px] font-bold uppercase px-2" onClick={() => setNewDme({ ...newDme, conversion_alert_dismissed: true } as any)}>Continuar como DME</Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-foreground/50">Prazo (Dias)</Label>
                  <Input 
                    type="number" 
                    value={newDme.deadline_days} 
                    onChange={(e) => setNewDme({ ...newDme, deadline_days: Number(e.target.value) })}
                    className="bg-background border-border/60 h-11 rounded-xl font-mono-kasa"
                  />
                </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-foreground/50">Status Inicial</Label>
              <Select value={newDme.status} onValueChange={(v) => setNewDme({ ...newDme, status: v })}>
                <SelectTrigger className="bg-background border-border/60 h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="pending_approval">Aguardando Aprovação</SelectItem>
                  <SelectItem value="approved">Aprovada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/40">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold uppercase tracking-tight">Cobrável</Label>
                <div className="text-[10px] text-foreground/40 leading-tight">Gerar lançamento financeiro ao aprovar</div>
              </div>
              <Switch checked={newDme.is_billable} onCheckedChange={(c) => setNewDme({ ...newDme, is_billable: c })} />
            </div>
          </div>
          
          <div className="p-6 bg-muted/20 border-t border-border/40 flex gap-3">
            <Button variant="ghost" className="flex-1 h-11 rounded-xl font-bold uppercase tracking-widest text-xs" onClick={() => setIsNewOpen(false)}>Cancelar</Button>
            <Button 
              className="flex-1 h-11 rounded-xl font-bold uppercase tracking-widest text-xs gap-2 shadow-lg shadow-primary/10" 
              onClick={() => createMut.mutate(newDme)} 
              disabled={!newDme.title || (newDme.origin === "contract" && !newDme.contract_id) || createMut.isPending}
            >
              {createMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Criar DME
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return <Clock className={className} />;
}
