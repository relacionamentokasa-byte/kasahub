import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  Check,
  ChevronDown,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Tag,
  Briefcase,
  UserCheck,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { effectiveAmount } from "@/lib/finance-values";
import { brl } from "@/lib/utils-format";
import { cn } from "@/lib/utils";
import { fetchCategoriasFinanceiras } from "@/lib/categorias-financeiras-api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UnlinkedTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: any[];
  clients: any[];
}

export function UnlinkedTransactionsDialog({
  open,
  onOpenChange,
  transactions,
  clients,
}: UnlinkedTransactionsDialogProps) {
  const qc = useQueryClient();
  const [activeClientPopoverId, setActiveClientPopoverId] = useState<string | null>(null);

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias_financeiras"],
    queryFn: fetchCategoriasFinanceiras,
  });

  // Filtra lançamentos do período sem cliente vinculado
  const unlinkedList = transactions.filter((t: any) => !t.client_id);

  const sortedClients = [...clients].sort((a: any, b: any) =>
    (a.company || a.name || "").localeCompare(b.company || b.name || "")
  );

  const updateTransactionMutation = useMutation({
    mutationFn: async ({
      transactionId,
      updates,
    }: {
      transactionId: string;
      updates: {
        client_id?: string | null;
        nature?: "operacional" | "nao_operacional";
        category?: string;
        is_internal?: boolean;
      };
    }) => {
      const { error } = await supabase
        .from("transactions")
        .update(updates)
        .eq("id", transactionId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["gestao-relatorios"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["contas_bancarias"] });
      qc.invalidateQueries({ queryKey: ["finance-stats"] });

      if (variables.updates.client_id !== undefined) {
        toast.success(
          variables.updates.client_id
            ? "Despesa vinculada ao cliente"
            : "Definido como Custo KASA (sem cliente)"
        );
      } else if (variables.updates.nature !== undefined) {
        toast.success(`Natureza atualizada para ${variables.updates.nature === "operacional" ? "Operacional" : "Não-operacional"}`);
      } else if (variables.updates.category !== undefined) {
        toast.success(`Categoria atualizada para "${variables.updates.category}"`);
      }
      setActiveClientPopoverId(null);
    },
    onError: (e: any) => {
      toast.error("Erro ao atualizar lançamento: " + (e?.message || ""));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-border/80 shadow-2xl">
        {/* Header no padrão institucional KASA HUB */}
        <DialogHeader className="p-5 sm:p-6 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Layers className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-kasa uppercase tracking-widest text-primary font-bold">
                  Classificação & Conciliação
                </span>
                <Badge variant="outline" className="font-mono-kasa text-[10px] tabular-nums border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                  {unlinkedList.length} {unlinkedList.length === 1 ? "pendente" : "pendentes"}
                </Badge>
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground mt-0.5">
                Auditoria e Classificação Financeira
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Defina o cliente (custo direto), a categoria (pró-labore, software, impostos) e a natureza (operacional vs não-operacional) de cada lançamento.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Lista de Transações */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-border/40 space-y-3 sm:space-y-0">
          {unlinkedList.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <Sparkles className="size-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">Tudo conciliado!</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Todos os lançamentos deste período estão com a alocação de clientes e classificação definida.
              </p>
            </div>
          ) : (
            unlinkedList.map((t: any) => {
              const amount = effectiveAmount(t);
              const isIncome = t.type === "income";
              const dateStr = (t.payment_date || t.due_date || "").slice(0, 10);
              const formattedDate = dateStr
                ? new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                : "—";

              const isProLabore =
                t.category === "Pró-Labore" ||
                t.category === "Distribuição de Lucros" ||
                String(t.description || "").toLowerCase().includes("labore");

              return (
                <div
                  key={t.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-muted/20 rounded-xl px-2 sm:px-3 -mx-2 transition-colors"
                >
                  {/* Info da Transação */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={cn(
                        "size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        isIncome
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      )}
                    >
                      {isIncome ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {t.description || "Lançamento sem descrição"}
                        </span>
                        {isProLabore && (
                          <Badge variant="outline" className="text-[9px] font-mono-kasa py-0 px-1.5 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10">
                            Pró-labore
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] font-mono-kasa text-muted-foreground tabular-nums flex-wrap">
                        <span>{formattedDate}</span>
                        <span>•</span>
                        <span className={cn("font-bold", isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
                          {brl(amount)}
                        </span>
                        {t.supplier_name && (
                          <>
                            <span>•</span>
                            <span className="truncate text-foreground/80">Fornecedor: {t.supplier_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Controles de Classificação Financeira */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/40">
                    {/* 1. Vínculo de Cliente */}
                    <Popover
                      open={activeClientPopoverId === t.id}
                      onOpenChange={(isOpen) => setActiveClientPopoverId(isOpen ? t.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-medium rounded-xl gap-1.5 border-border/80 hover:bg-muted/50 text-foreground"
                          title="Vincular a um cliente ou manter como Custo KASA"
                        >
                          <Building2 className="size-3.5 text-primary shrink-0" />
                          <span className="truncate max-w-[110px]">
                            {t.client_id
                              ? clients.find((c: any) => c.id === t.client_id)?.company || "Cliente"
                              : "Custo KASA"}
                          </span>
                          <ChevronDown className="size-3 opacity-50 ml-0.5 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-64 p-0 rounded-xl shadow-xl">
                        <Command>
                          <CommandInput placeholder="Buscar cliente..." className="h-9 text-xs" />
                          <CommandList>
                            <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                              Nenhum cliente encontrado.
                            </CommandEmpty>
                            <CommandGroup heading="Estrutura">
                              <CommandItem
                                value="custo-geral-kasa"
                                onSelect={() => {
                                  updateTransactionMutation.mutate({
                                    transactionId: t.id,
                                    updates: { client_id: null, is_internal: true },
                                  });
                                }}
                                className="flex items-center justify-between text-xs py-2"
                              >
                                <div className="flex items-center gap-2 truncate text-muted-foreground">
                                  <div className="size-5 rounded bg-muted flex items-center justify-center shrink-0">
                                    <X className="size-3" />
                                  </div>
                                  <span className="truncate font-medium">Manter como Custo KASA</span>
                                </div>
                                {!t.client_id && <Check className="size-3.5 text-primary" />}
                              </CommandItem>
                            </CommandGroup>
                            <CommandSeparator />
                            <CommandGroup heading="Vincular ao Cliente">
                              {sortedClients.map((c: any) => {
                                const label = c.company || c.name || "Sem nome";
                                const isSelected = t.client_id === c.id;
                                return (
                                  <CommandItem
                                    key={c.id}
                                    value={label}
                                    onSelect={() => {
                                      updateTransactionMutation.mutate({
                                        transactionId: t.id,
                                        updates: { client_id: c.id, is_internal: false },
                                      });
                                    }}
                                    className="flex items-center justify-between text-xs py-2"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <Avatar className="size-5 shrink-0">
                                        {c.logo_url && <AvatarImage src={c.logo_url} alt={label} />}
                                        <AvatarFallback className="text-[9px] font-bold">
                                          {label.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="truncate">{label}</span>
                                    </div>
                                    {isSelected && <Check className="size-3.5 text-primary" />}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* 2. Natureza (Operacional vs Não-operacional) */}
                    <Select
                      value={t.nature || "operacional"}
                      onValueChange={(val: "operacional" | "nao_operacional") => {
                        updateTransactionMutation.mutate({
                          transactionId: t.id,
                          updates: { nature: val },
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs rounded-xl w-[125px] border-border/80 bg-background">
                        <Briefcase className="size-3 text-muted-foreground shrink-0 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end" className="text-xs">
                        <SelectItem value="operacional">Operacional</SelectItem>
                        <SelectItem value="nao_operacional">Não-operacional</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* 3. Categoria Financeira */}
                    <Select
                      value={t.category || ""}
                      onValueChange={(val: string) => {
                        updateTransactionMutation.mutate({
                          transactionId: t.id,
                          updates: { category: val },
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs rounded-xl w-[145px] border-border/80 bg-background">
                        <Tag className="size-3 text-muted-foreground shrink-0 mr-1" />
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent align="end" className="max-h-[220px] text-xs">
                        {categorias
                          .filter((c) => !isIncome ? c.tipo === "Despesa" : c.tipo === "Receita")
                          .map((c) => (
                            <SelectItem key={c.id} value={c.nome || ""}>
                              {c.nome}
                            </SelectItem>
                          ))}
                        {categorias.length === 0 && (
                          <>
                            <SelectItem value="Pró-Labore">Pró-Labore</SelectItem>
                            <SelectItem value="Distribuição de Lucros">Distribuição de Lucros</SelectItem>
                            <SelectItem value="Ferramentas de Marketing e Software">Software / Ferramentas</SelectItem>
                            <SelectItem value="Salários e Encargos">Salários / Freelancers</SelectItem>
                            <SelectItem value="Impostos">Impostos</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé com orientações */}
        <div className="p-4 border-t border-border/60 bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-[11px] font-mono-kasa text-muted-foreground">
            <span className="inline-block size-2 rounded-full bg-primary" />
            <span>Altera instantaneamente o DRE, margens e custos da agência.</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs rounded-xl self-end sm:self-auto"
          >
            Concluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
