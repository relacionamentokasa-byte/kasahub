import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileSignature,
  TrendingUp,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  Layers,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/utils-format";
import { fetchClientServices } from "@/lib/client-services-api";
import { createAndApplyAddendum } from "@/lib/contract-addendums-api";
import {
  type AddendumType,
  ADDENDUM_TYPE_LABELS,
} from "@/types/contract-addendums";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: {
    id: string;
    title: string;
    monthly_value: number | null;
    start_date: string;
    client_id: string;
    service_ids?: string[] | null;
  };
  clientId: string;
}

export function ContractAddendumDialog({ open, onOpenChange, contract, clientId }: Props) {
  const qc = useQueryClient();

  // Buscar serviços ativos do cliente
  const { data: clientServices = [] } = useQuery({
    queryKey: ["client-services", clientId],
    queryFn: () => fetchClientServices(clientId),
    enabled: open && !!clientId,
  });

  // Buscar catálogo geral de serviços
  const { data: catalogServices = [] } = useQuery({
    queryKey: ["catalog-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, description, default_price, category")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Consolidar serviços ativos: usa client_services e fallback para service_ids do contrato
  const currentServices = useMemo(() => {
    if (clientServices.length > 0) {
      return clientServices;
    }
    // Fallback: se o cliente ainda não tem client_services detalhados mas o contrato possui service_ids
    if (contract.service_ids && contract.service_ids.length > 0) {
      return contract.service_ids.map((sid) => {
        const found = catalogServices.find((cs) => cs.id === sid);
        return {
          id: sid,
          client_id: clientId,
          service_id: sid,
          monthly_value: found?.default_price || 0,
          notes: null,
          created_at: contract.start_date,
          services: found
            ? {
                id: found.id,
                name: found.name,
                category: found.category,
                default_price: found.default_price,
              }
            : null,
        } as any;
      });
    }
    return [];
  }, [clientServices, contract.service_ids, contract.start_date, clientId, catalogServices]);

  const previousMonthlyValue = Number(contract.monthly_value || 0);

  // Estados do formulário
  const [addendumType, setAddendumType] = useState<AddendumType>("mixed");
  const [title, setTitle] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => {
    // Padrão: primeiro dia do próximo mês
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString().split("T")[0];
  });
  const [newMonthlyValue, setNewMonthlyValue] = useState(previousMonthlyValue);
  const [oneTimeValue, setOneTimeValue] = useState<number>(0);
  const [oneTimeDueDate, setOneTimeDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [syncTransactions, setSyncTransactions] = useState(true);

  // Serviços a Adicionar
  const [selectedCatalogServiceId, setSelectedCatalogServiceId] = useState<string>("none");
  const [addedServices, setAddedServices] = useState<
    { service_id: string; name: string; monthly_value: number }[]
  >([]);

  // Serviços a Remover (IDs de client_services)
  const [removedServiceIds, setRemovedServiceIds] = useState<string[]>([]);

  // Mutação para salvar e aplicar o aditivo
  const applyMutation = useMutation({
    mutationFn: async () => {
      return createAndApplyAddendum({
        contractId: contract.id,
        clientId,
        type: addendumType,
        title: title.trim() || `Termo Aditivo - ${contract.title}`,
        effectiveDate,
        previousMonthlyValue,
        newMonthlyValue,
        oneTimeValue: oneTimeValue > 0 ? oneTimeValue : undefined,
        oneTimeDueDate: oneTimeValue > 0 ? oneTimeDueDate : undefined,
        servicesToAdd: addedServices,
        servicesToRemove: removedServiceIds,
        notes: notes.trim() || undefined,
        syncFutureTransactions: syncTransactions,
      });
    },
    onSuccess: (newAddendum) => {
      toast.success(`${newAddendum.addendum_number}º Termo Aditivo aplicado com sucesso!`);
      qc.invalidateQueries({ queryKey: ["client-contracts", clientId] });
      qc.invalidateQueries({ queryKey: ["client-addendums", contract.id] });
      qc.invalidateQueries({ queryKey: ["client-services", clientId] });
      qc.invalidateQueries({ queryKey: ["client-transactions", clientId] });
      qc.invalidateQueries({ queryKey: ["client", clientId] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(`Erro ao aplicar aditivo: ${err.message}`);
    },
  });

  const handleAddService = () => {
    if (selectedCatalogServiceId === "none") return;
    const found = catalogServices.find((s) => s.id === selectedCatalogServiceId);
    if (!found) return;

    const val = Number(found.default_price || 0);
    setAddedServices([
      ...addedServices,
      { service_id: found.id, name: found.name, monthly_value: val },
    ]);
    // Sugere aumento no novo valor mensal
    setNewMonthlyValue((prev) => prev + val);
    setSelectedCatalogServiceId("none");
  };

  const handleRemoveAddedService = (index: number) => {
    const item = addedServices[index];
    setAddedServices(addedServices.filter((_, i) => i !== index));
    setNewMonthlyValue((prev) => Math.max(0, prev - item.monthly_value));
  };

  const toggleRemoveCurrentService = (serviceId: string, value: number) => {
    if (removedServiceIds.includes(serviceId)) {
      setRemovedServiceIds(removedServiceIds.filter((id) => id !== serviceId));
      setNewMonthlyValue((prev) => prev + value);
    } else {
      setRemovedServiceIds([...removedServiceIds, serviceId]);
      setNewMonthlyValue((prev) => Math.max(0, prev - value));
    }
  };

  const valueDelta = newMonthlyValue - previousMonthlyValue;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <FileSignature className="size-5 text-primary" />
            Emitir Termo Aditivo de Contrato
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Formalize reajustes de valor, acréscimos ou supressões de serviços conectados diretamente ao Financeiro.
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 1. Tipo do Aditivo & Título */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de Alteração</Label>
              <Select value={addendumType} onValueChange={(v) => setAddendumType(v as AddendumType)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ADDENDUM_TYPE_LABELS).map(([key, val]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Data de Vigência</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="text-xs font-mono-kasa"
                />
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Título / Descrição do Aditivo</Label>
              <Input
                placeholder="Ex: 1º Termo Aditivo - Inclusão de Gestão de Tráfego e Reajuste de Fee"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* 2. Comparativo de Valores e Impacto no MRR */}
          <div className="rounded-lg border border-border/70 bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <DollarSign className="size-4 text-emerald-500" />
                Impacto no Fee Mensal (MRR)
              </span>
              <Badge
                variant={valueDelta > 0 ? "default" : valueDelta < 0 ? "destructive" : "outline"}
                className="font-mono-kasa text-[10px]"
              >
                {valueDelta > 0 ? `+${brl(valueDelta)}` : valueDelta < 0 ? brl(valueDelta) : "Sem alteração"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <Label className="text-[11px] text-muted-foreground">Valor Mensal Atual</Label>
                <p className="text-base font-mono-kasa font-bold text-muted-foreground/80 mt-0.5">
                  {brl(previousMonthlyValue)}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">Novo Valor Mensal Contratado</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newMonthlyValue}
                  onChange={(e) => setNewMonthlyValue(Number(e.target.value))}
                  className="h-9 text-sm font-mono-kasa font-bold text-emerald-600 dark:text-emerald-400 bg-background"
                />
              </div>
            </div>

            {/* Opção de Valor Avulso / Taxa de Setup */}
            <div className="pt-2 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Valor Avulso / Setup Adicional (Opcional)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={oneTimeValue || ""}
                  onChange={(e) => setOneTimeValue(Number(e.target.value))}
                  className="h-8 text-xs font-mono-kasa bg-background"
                />
              </div>

              {oneTimeValue > 0 && (
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Vencimento do Valor Avulso</Label>
                  <Input
                    type="date"
                    value={oneTimeDueDate}
                    onChange={(e) => setOneTimeDueDate(e.target.value)}
                    className="h-8 text-xs font-mono-kasa bg-background"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 3. Gestão de Escopo de Serviços */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Layers className="size-4 text-primary" />
              Ajustes no Escopo de Serviços
            </Label>

            {/* Adicionar novos serviços */}
            <div className="p-3 border border-border/60 rounded-lg bg-card space-y-2">
              <p className="text-[11px] font-medium text-foreground">+ Adicionar Novos Serviços ao Contrato</p>
              <div className="flex items-center gap-2">
                <Select value={selectedCatalogServiceId} onValueChange={setSelectedCatalogServiceId}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Selecione um serviço do catálogo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">
                      Selecione um serviço...
                    </SelectItem>
                    {catalogServices.map((cs) => (
                      <SelectItem key={cs.id} value={cs.id} className="text-xs">
                        {cs.name} ({brl(Number(cs.default_price || 0))}/mês)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddService}
                  disabled={selectedCatalogServiceId === "none"}
                  className="h-8 text-xs gap-1"
                >
                  <Plus className="size-3" /> Adicionar
                </Button>
              </div>

              {addedServices.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {addedServices.map((as, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs"
                    >
                      <span className="font-medium text-foreground">{as.name}</span>
                      <div className="flex items-center gap-2 font-mono-kasa">
                        <span className="text-emerald-600 font-bold">{brl(as.monthly_value)}/mês</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveAddedService(idx)}
                          className="size-6 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cancelar/Remover serviços atuais */}
            {currentServices.length > 0 && (
              <div className="p-3 border border-border/60 rounded-lg bg-card space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Serviços Atuais (Marque para suspender/remover neste aditivo)
                </p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {currentServices.map((cs) => {
                    const isRemoved = removedServiceIds.includes(cs.id);
                    const val = Number(cs.monthly_value || 0);
                    const serviceName = cs.services?.name || cs.notes || "Serviço Ativo";
                    return (
                      <div
                        key={cs.id}
                        onClick={() => toggleRemoveCurrentService(cs.id, val)}
                        className={`flex items-center justify-between p-2 rounded border text-xs cursor-pointer transition-colors ${
                          isRemoved
                            ? "bg-destructive/10 border-destructive/30 line-through text-muted-foreground"
                            : "bg-muted/10 border-border/40 hover:bg-muted/20 text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox checked={isRemoved} className="size-3.5" />
                          <div className="flex flex-col">
                            <span className="font-medium">{serviceName}</span>
                            {cs.notes && cs.services?.name && (
                              <span className="text-[10px] text-muted-foreground">{cs.notes}</span>
                            )}
                          </div>
                        </div>
                        <span className="font-mono-kasa font-medium">{brl(val)}/mês</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 4. Sincronização Financeira Automática */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-primary/30 bg-primary/5">
            <Checkbox
              id="sync-trans"
              checked={syncTransactions}
              onCheckedChange={(c) => setSyncTransactions(!!c)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label htmlFor="sync-trans" className="text-xs font-semibold cursor-pointer text-foreground">
                Sincronizar lançamentos futuros no Financeiro
              </Label>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Atualiza automaticamente o valor previsto de todas as faturas a receber pendentes com vencimento a partir da data de vigência ({new Date(effectiveDate).toLocaleDateString()}).
              </p>
            </div>
          </div>

          {/* 5. Justificativa / Cláusulas do Aditivo */}
          <div className="space-y-1.5">
            <Label className="text-xs">Observações & Justificativa do Aditivo</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Reajuste acordado na reunião trimestral de alinhamento com a diretoria..."
              className="text-xs bg-muted/10"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => applyMutation.mutate()}
            disabled={applyMutation.isPending}
            className="text-xs gap-1.5 bg-primary text-primary-foreground font-semibold"
          >
            <CheckCircle2 className="size-4" />
            {applyMutation.isPending ? "Aplicando..." : "Aplicar Termo Aditivo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
