import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchIndicators, deleteIndicator, type AgencyIndicator } from "@/lib/performance-api";
import { fetchTransactions, fetchContracts, brl } from "@/lib/finance-api";
import { fetchJobs, fetchClients } from "@/lib/ops-api";
import { fetchProposals } from "@/lib/crm-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, MoreHorizontal, TrendingUp, Target, Activity, CheckCircle2, AlertTriangle, Trash2, Edit2, Copy } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { IndicatorDialog } from "./IndicatorDialog";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";

export function IndicatorsManager() {
  const qc = useQueryClient();
  const { isAdmin, can } = usePermissions();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<AgencyIndicator | null>(null);

  // Queries para cálculo de realizado
  const { data: indicators = [], isLoading: loadingIndicators } = useQuery({ 
    queryKey: ["agency-indicators"], 
    queryFn: fetchIndicators 
  });
  
  const { data: contracts = [] } = useQuery({ queryKey: ["contracts"], queryFn: () => fetchContracts() });
  const { data: transactions = [] } = useQuery({ queryKey: ["transactions"], queryFn: () => fetchTransactions() });
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => fetchJobs() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: proposals = [] } = useQuery({ queryKey: ["proposals"], queryFn: fetchProposals });

  const deleteMut = useMutation({
    mutationFn: deleteIndicator,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agency-indicators"] });
      toast.success("Meta arquivada");
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const calculateActual = (indicator: AgencyIndicator) => {
    // Cálculo simplificado baseado no mês atual para o MVP
    const today = new Date();
    const monthStr = today.toISOString().slice(0, 7); // YYYY-MM

    switch (indicator.data_source) {
      case 'contracts_mrr':
        return contracts.filter(c => c.status === 'active').reduce((acc, c) => acc + Number(c.monthly_value), 0);
      case 'contracts_count':
        return contracts.filter(c => c.status === 'active' && c.created_at.startsWith(monthStr)).length;
      case 'proposals_accepted':
        return proposals.filter(p => p.status === 'accepted' && p.updated_at.startsWith(monthStr)).length;
      case 'jobs_done':
        return jobs.filter(j => j.done_at && j.done_at.startsWith(monthStr)).length;
      case 'clients_active':
        return clients.filter(c => c.status === 'active').length;
      case 'clients_new':
        return clients.filter(c => c.created_at.startsWith(monthStr)).length;
      case 'revenue_yearly':
        const currentYear = today.getFullYear().toString();
        return transactions
          .filter(t => t.kind === 'income' && t.status === 'paid' && (t.paid_at || t.due_date || '').startsWith(currentYear))
          .reduce((acc, t) => acc + Number(t.amount), 0);
      default:
        return 0; // Manual ou outro
    }
  };

  if (loadingIndicators) return <div className="py-20 text-center animate-pulse">Carregando indicadores...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-display">Metas Estratégicas</h2>
          <p className="text-sm text-foreground/50">Acompanhamento de performance em tempo real.</p>
        </div>
        {(isAdmin || can("config", "edit")) && (
          <Button onClick={() => { setEditingIndicator(null); setIsDialogOpen(true); }} className="gap-2">
            <Plus className="size-4" /> Nova Meta
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {indicators.map((indicator) => {
          const actual = calculateActual(indicator);
          const percent = indicator.target_value > 0 ? (actual / indicator.target_value) * 100 : 0;
          const statusColor = percent >= 100 ? "text-emerald-500" : percent >= 70 ? "text-amber-500" : "text-rose-500";
          const bgColor = percent >= 100 ? "bg-emerald-500/10" : percent >= 70 ? "bg-amber-500/10" : "bg-rose-500/10";

          return (
            <Card key={indicator.id} className="p-6 bg-surface border-border hover:border-primary/40 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0", bgColor)}>
                  <Target className={cn("size-5", statusColor)} />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditingIndicator(indicator); setIsDialogOpen(true); }} className="gap-2">
                      <Edit2 className="size-3.5" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteMut.mutate(indicator.id)} className="gap-2 text-rose-500">
                      <Trash2 className="size-3.5" /> Arquivar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/40">{indicator.category}</p>
                <h3 className="font-bold text-lg leading-tight">{indicator.name}</h3>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div>
                  <p className="text-[10px] text-foreground/40 uppercase">Meta</p>
                  <p className="text-sm font-bold">{indicator.type === 'monetary' ? brl(indicator.target_value) : indicator.target_value}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-foreground/40 uppercase">Realizado</p>
                  <p className={cn("text-sm font-bold", statusColor)}>{indicator.type === 'monetary' ? brl(actual) : actual}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-foreground/40">{indicator.periodicity}</span>
                  <span className={statusColor}>{Math.round(percent)}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-1000", 
                      percent >= 100 ? "bg-emerald-500" : percent >= 70 ? "bg-amber-500" : "bg-rose-500"
                    )}
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <IndicatorDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        indicator={editingIndicator} 
      />
    </div>
  );
}
