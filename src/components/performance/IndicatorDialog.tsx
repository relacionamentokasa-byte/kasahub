import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  createIndicator, 
  updateIndicator, 
  type AgencyIndicator,
  type IndicatorCategory,
  type IndicatorType,
  type IndicatorPeriodicity,
  type IndicatorDataSource
} from "@/lib/performance-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicator?: AgencyIndicator | null;
}

export function IndicatorDialog({ open, onOpenChange, indicator }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<AgencyIndicator>>(indicator || {
    name: "",
    category: "commercial",
    type: "monetary",
    target_value: 0,
    periodicity: "monthly",
    start_date: new Date().toISOString().slice(0, 10),
    responsible: "company",
    data_source: "manual",
    status: "active"
  });

  const mut = useMutation({
    mutationFn: (data: Partial<AgencyIndicator>) => {
      if (indicator?.id) return updateIndicator(indicator.id, data);
      return createIndicator(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agency-indicators"] });
      toast.success(indicator ? "Meta atualizada" : "Meta criada");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const handleSubmit = () => {
    if (!form.name || !form.target_value || !form.start_date) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    mut.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {indicator ? "Editar Meta" : "Nova Meta"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-1.5 col-span-2">
            <Label>Nome da Meta</Label>
            <Input 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})} 
              placeholder="Ex: Receita Mensal Recorrente"
              className="bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={v => setForm({...form, category: v as IndicatorCategory})}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="commercial">Comercial</SelectItem>
                <SelectItem value="financial">Financeiro</SelectItem>
                <SelectItem value="operational">Operacional</SelectItem>
                <SelectItem value="clients">Clientes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={form.type} onValueChange={v => setForm({...form, type: v as IndicatorType})}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monetary">Valor Monetário (R$)</SelectItem>
                <SelectItem value="quantity">Quantidade</SelectItem>
                <SelectItem value="percentage">Percentual (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Valor da Meta</Label>
            <Input 
              type="number" 
              value={form.target_value} 
              onChange={e => setForm({...form, target_value: Number(e.target.value)})} 
              className="bg-background font-bold text-primary"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Periodicidade</Label>
            <Select value={form.periodicity} onValueChange={v => setForm({...form, periodicity: v as IndicatorPeriodicity})}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="semiannual">Semestral</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Data Inicial</Label>
            <Input 
              type="date" 
              value={form.start_date} 
              onChange={e => setForm({...form, start_date: e.target.value})} 
              className="bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Select value={form.responsible} onValueChange={v => setForm({...form, responsible: v})}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="company">Empresa</SelectItem>
                <SelectItem value="commercial">Comercial</SelectItem>
                <SelectItem value="financial">Financeiro</SelectItem>
                <SelectItem value="operations">Operações</SelectItem>
                <SelectItem value="board">Diretoria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 col-span-2">
            <Label>Origem dos Dados</Label>
            <Select value={form.data_source} onValueChange={v => setForm({...form, data_source: v as IndicatorDataSource})}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual (Informar realizado mensalmente)</SelectItem>
                <SelectItem value="contracts_mrr">Receita Contratada (MRR - Contratos)</SelectItem>
                <SelectItem value="contracts_count">Contratos Fechados (Qtd - Contratos)</SelectItem>
                <SelectItem value="proposals_accepted">Propostas Aprovadas (Qtd - CRM)</SelectItem>
                <SelectItem value="extra_income">Receita Extra (DMEs)</SelectItem>
                <SelectItem value="jobs_done">Jobs Concluídos (Jobs)</SelectItem>
                <SelectItem value="projects_finished">Projetos Finalizados (Projetos)</SelectItem>
                <SelectItem value="clients_active">Clientes Ativos (Base)</SelectItem>
                <SelectItem value="clients_new">Novos Clientes (Novos Cadastros)</SelectItem>
                <SelectItem value="revenue_monthly">Faturamento Mensal (Transações Pagas)</SelectItem>
                <SelectItem value="revenue_yearly">Faturamento Anual (Transações Pagas)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={mut.isPending}>
            {indicator ? "Salvar Alterações" : "Criar Meta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
