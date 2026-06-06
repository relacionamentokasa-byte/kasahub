import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  CircleDollarSign,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  CheckCircle2,
  Circle,
  Upload,
  List,
  BarChart3,
  LineChart as LineIcon,
  Landmark,
  Link as LinkIcon,
  MoreHorizontal,
  Pause,
  Play,
  XCircle,
  Calendar,
  Tag,
  Briefcase,
  CheckSquare,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  accountBalance,
  accountStats,
  annualForecast,
  brl,
  cashflowByMonth,
  computeIndicators,
  deleteBankAccount,
  deleteTransaction,
  fetchBankAccounts,
  fetchCategories,
  fetchContracts,
  fetchTransactions,
  fetchRecurrences,
  markPaid,

  bulkDeleteTransactions,
  bulkUpdateTransactions,
  updateRecurrence,
} from "@/lib/finance-api";

import { fetchClients } from "@/lib/ops-api";
import { NewTransactionDialog } from "@/components/finance/NewTransactionDialog";
import { NewBankAccountDialog } from "@/components/finance/NewBankAccountDialog";
import { ImportTransactionsDialog } from "@/components/finance/ImportTransactionsDialog";
import { SettleTransactionDialog } from "@/components/finance/SettleTransactionDialog";
import type { Transaction } from "@/lib/finance-api";
import { toast } from "sonner";
import { DeleteFutureInstallmentsDialog } from "@/components/finance/DeleteFutureInstallmentsDialog";
import { TerminateRecurrenceDialog } from "@/components/finance/TerminateRecurrenceDialog";


export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — KASA OS" }] }),
  component: FinanceiroPage,
});

function monthPeriod(year: number, month0: number) {
  return {
    from: new Date(year, month0, 1).toISOString().slice(0, 10),
    to: new Date(year, month0 + 1, 0).toISOString().slice(0, 10),
  };
}

const MONTH_NAMES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function FinanceiroPage() {
  const qc = useQueryClient();
  const { data: txs = [] } = useQuery({ queryKey: ["transactions"], queryFn: () => fetchTransactions() });
  const { data: accounts = [] } = useQuery({ queryKey: ["bank_accounts"], queryFn: fetchBankAccounts });
  const { data: contracts = [] } = useQuery({ queryKey: ["contracts"], queryFn: () => fetchContracts() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: categories = [] } = useQuery({ queryKey: ["financial_categories"], queryFn: fetchCategories });
  const { data: recurrences = [] } = useQuery({ queryKey: ["recurrences"], queryFn: fetchRecurrences });



  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const period = useMemo(() => monthPeriod(year, month), [year, month]);
  const monthLabel = `${MONTH_NAMES_PT[month]} ${year}`;
  const monthLabelShort = `${MONTH_NAMES_PT[month]}/${year}`;

  const [search, setSearch] = useState("");
  const [fKind, setFKind] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("all");
  const [fClient, setFClient] = useState<string>("all");
  const [fCategory, setFCategory] = useState<string>("all");
  const [fAccount, setFAccount] = useState<string>("all");

  const [openTx, setOpenTx] = useState<false | "income" | "expense">(false);
  const [openAcc, setOpenAcc] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [settleTx, setSettleTx] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteFutureRecurrenceId, setDeleteFutureRecurrenceId] = useState<string | null>(null);
  const [terminateRecurrenceId, setTerminateRecurrenceId] = useState<string | null>(null);


  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const clientName = (id: string | null | undefined) =>
    id ? clients.find((c) => c.id === id)?.company || clients.find((c) => c.id === id)?.name || "—" : "—";
  const catName = (id: string | null | undefined) =>
    id ? categories.find((c) => c.id === id)?.name || "—" : "—";
  const accName = (id: string | null | undefined) =>
    id ? accounts.find((a) => a.id === id)?.name || "—" : "—";

  const indicators = useMemo(
    () => computeIndicators(txs, contracts, period),
    [txs, contracts, period],
  );
  const consolidated = accounts.reduce((s, a) => s + accountBalance(a, txs), 0);

  const chartData = useMemo(() => cashflowByMonth(txs, 6), [txs]);
  const forecast = useMemo(() => annualForecast(txs, contracts), [txs, contracts]);
  const forecastTotals = forecast.reduce(
    (acc, m) => ({ income: acc.income + m.income, expense: acc.expense + m.expense }),
    { income: 0, expense: 0 },
  );

  // Filtered rows for Lista
  const rows = useMemo(() => {
    return txs.filter((t) => {
      if (period.from && t.due_date < period.from) return false;
      if (period.to && t.due_date > period.to) return false;
      if (fKind !== "all" && t.kind !== fKind) return false;
      if (fStatus !== "all" && t.status !== fStatus) return false;
      if (fClient !== "all" && (t.client_id ?? "") !== fClient) return false;
      if (fCategory !== "all" && (t.category_id ?? "") !== fCategory) return false;
      if (fAccount !== "all" && (t.account_id ?? "") !== fAccount) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [txs, period, fKind, fStatus, fClient, fCategory, fAccount, search]);

  const togglePaid = useMutation({
    mutationFn: ({ id, paid }: { id: string; paid: boolean }) => markPaid(id, paid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const delTx = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
  const delAcc = useMutation({
    mutationFn: (id: string) => deleteBankAccount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank_accounts"] }),
  });

  const bulkDelete = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteTransactions(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setSelectedIds([]);
      toast.success("Transações excluídas com sucesso");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkUpdate = useMutation({
    mutationFn: ({ ids, patch }: { ids: string[]; patch: any }) => bulkUpdateTransactions(ids, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setSelectedIds([]);
      toast.success("Transações atualizadas com sucesso");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleRecurrenceStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "paused" | "terminated" }) => 
      updateRecurrence(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["recurrences"] });
      toast.success("Status da recorrência atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });


  // Visão Mensal aggregations
  const monthly = chartData.map((m) => ({ ...m, profit: m.income - m.expense }));

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 lg:px-10 pt-6 pb-4 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">
            Financeiro
          </h1>
          <p className="text-sm text-foreground/60 mt-1">Controle de receitas e despesas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setOpenImport(true)}
            variant="outline"
            className="border-border rounded-full h-10 px-4 gap-2"
          >
            <Upload className="size-4" /> Importar
          </Button>
          <Button
            onClick={() => setOpenTx("income")}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold h-10 px-5 gap-2"
          >
            <Plus className="size-4" /> Nova Transação
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 lg:px-10 pb-10">
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="bg-surface border border-border">
            <TabsTrigger value="list" className="gap-2"><List className="size-4" /> Lista</TabsTrigger>
            <TabsTrigger value="recurrences" className="gap-2"><Clock className="size-4" /> Recorrências</TabsTrigger>
            <TabsTrigger value="monthly" className="gap-2"><BarChart3 className="size-4" /> Visão Mensal</TabsTrigger>
            <TabsTrigger value="annual" className="gap-2"><LineIcon className="size-4" /> Previsão Anual</TabsTrigger>
            <TabsTrigger value="accounts" className="gap-2"><Landmark className="size-4" /> Contas Banc.</TabsTrigger>

          </TabsList>

          {/* ============ LISTA ============ */}
          <TabsContent value="list" className="mt-6 space-y-6">
            {/* Month nav */}
            <div className="flex items-center justify-between bg-surface border border-border rounded-2xl px-4 py-3">
              <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
                <ChevronLeft className="size-4" />
              </Button>
              <div className="font-display text-lg font-semibold capitalize">{monthLabel}</div>
              <Button variant="outline" size="icon" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
                <ChevronRight className="size-4" />
              </Button>
            </div>

            {/* Bulk Actions Toolbar */}
            {selectedIds.length > 0 && (
              <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-2xl px-5 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-primary">{selectedIds.length} selecionados</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedIds([])}
                    className="h-8 text-[11px] uppercase tracking-wider"
                  >
                    Desmarcar tudo
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="h-8 rounded-full gap-2">
                        Ações em Massa <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => bulkUpdate.mutate({ ids: selectedIds, patch: { status: 'paid', paid_at: new Date().toISOString().slice(0,10) } })}>
                        <CheckCircle2 className="size-4 mr-2 text-emerald-400" /> Dar baixa
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => bulkUpdate.mutate({ ids: selectedIds, patch: { status: 'pending', paid_at: null } })}>
                        <Clock className="size-4 mr-2" /> Remover baixa
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        const selectedRecurrenceIds = Array.from(new Set(
                          rows.filter(r => selectedIds.includes(r.id) && r.recurrence_id)
                              .map(r => r.recurrence_id)
                        )) as string[];

                        if (selectedRecurrenceIds.length > 0) {
                          setDeleteFutureRecurrenceId(selectedRecurrenceIds[0]);
                          if (selectedRecurrenceIds.length > 1) {
                            toast.info("Múltiplas recorrências selecionadas. Agindo sobre a primeira encontrada.");
                          }
                        } else {
                          toast.error("Nenhuma recorrência identificada nos itens selecionados");
                        }
                      }}>
                        <Calendar className="size-4 mr-2" /> Excluir parcelas futuras
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const selectedRecurrenceIds = Array.from(new Set(
                          rows.filter(r => selectedIds.includes(r.id) && r.recurrence_id)
                              .map(r => r.recurrence_id)
                        )) as string[];

                        if (selectedRecurrenceIds.length > 0) {
                          setTerminateRecurrenceId(selectedRecurrenceIds[0]);
                          if (selectedRecurrenceIds.length > 1) {
                            toast.info("Múltiplas recorrências selecionadas. Agindo sobre a primeira encontrada.");
                          }
                        } else {
                          toast.error("Nenhuma recorrência identificada nos itens selecionados");
                        }
                      }}>
                        <XCircle className="size-4 mr-2" /> Encerrar recorrência
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-rose-400" onClick={() => bulkDelete.mutate(selectedIds)}>
                        <Trash2 className="size-4 mr-2" /> Excluir selecionadas
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}


            {/* KPI grid — apenas 4 indicadores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Kpi
                label="Receitas Previstas"
                value={brl(indicators.receitasPrevistas)}
                tone="primary"
                icon={<Clock className="size-4" />}
              />
              <Kpi
                label="Receitas Recebidas"
                value={brl(indicators.receitasRecebidas)}
                tone="success"
                icon={<TrendingUp className="size-4" />}
              />
              <Kpi
                label="Parcelas Futuras"
                value={brl(indicators.parcelasFuturas)}
                tone="warning"
                icon={<CircleDollarSign className="size-4" />}
              />
              <Kpi
                label="Despesas Pagas"
                value={brl(indicators.despesasPagas)}
                tone="danger"
                icon={<TrendingDown className="size-4" />}
              />
            </div>

            {/* Filters (optional) */}
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 md:col-span-4 relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9" />
              </div>
              <FilterSelect value={fKind} onChange={setFKind} placeholder="Todos Tipos" options={[
                { value: "all", label: "Todos Tipos" },
                { value: "income", label: "Receitas" },
                { value: "expense", label: "Despesas" },
              ]} />
              <FilterSelect value={fStatus} onChange={setFStatus} placeholder="Todos Status" options={[
                { value: "all", label: "Todos Status" },
                { value: "paid", label: "Pagas" },
                { value: "pending", label: "Pendentes" },
                { value: "cancelled", label: "Canceladas" },
              ]} />
              <FilterSelect value={fClient} onChange={setFClient} placeholder="Todos Clientes" options={[
                { value: "all", label: "Todos Clientes" },
                ...clients.map((c) => ({ value: c.id, label: c.company || c.name })),
              ]} />
              <FilterSelect value={fCategory} onChange={setFCategory} placeholder="Todas categorias" options={[
                { value: "all", label: "Todas categorias" },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]} />
              <FilterSelect value={fAccount} onChange={setFAccount} placeholder="Todas contas" options={[
                { value: "all", label: "Todas contas" },
                ...accounts.map((a) => ({ value: a.id, label: a.name })),
              ]} />
            </div>

            {/* Lançamentos do mês */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border font-display font-semibold">
                Lançamentos de {monthLabelShort}
              </div>
              <div className="grid grid-cols-12 px-5 py-3 text-[11px] uppercase tracking-wide text-foreground/40 border-b border-border items-center">
                <div className="col-span-1 flex items-center gap-3">
                  <Checkbox 
                    checked={rows.length > 0 && selectedIds.length === rows.length}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedIds(rows.map(r => r.id));
                      else setSelectedIds([]);
                    }}
                  />
                  <span>Status</span>
                </div>
                <div className="col-span-3">Descrição</div>

                <div className="col-span-2">Categoria</div>
                <div className="col-span-2">Cliente</div>
                <div className="col-span-1 text-right">Valor</div>
                <div className="col-span-1">Vencimento</div>
                <div className="col-span-2 text-right">Ações</div>
              </div>
              {rows.length === 0 ? (
                <div className="p-12 text-center text-foreground/50 text-sm">Nenhum lançamento neste mês</div>
              ) : (
                rows.map((t) => {
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const overdue = t.status === "pending" && t.due_date < todayStr;
                  const origin = t.contract_id
                    ? { label: "Recorrência", tone: "text-primary border-primary/40" }
                    : t.installment_total && t.installment_total > 1
                    ? { label: `Parcela ${t.installment_number}/${t.installment_total}`, tone: "text-blue-300 border-blue-500/40" }
                    : t.proposal_id
                    ? { label: "Proposta", tone: "text-purple-300 border-purple-500/40" }
                    : { label: "Manual", tone: "text-foreground/40 border-border" };
                  return (
                    <div key={t.id} className="grid grid-cols-12 px-5 py-3 items-center border-b border-border/40 last:border-b-0 hover:bg-foreground/[0.02] group">
                      <div className="col-span-1 flex items-center gap-3">
                        <Checkbox 
                          checked={selectedIds.includes(t.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedIds(prev => [...prev, t.id]);
                            else setSelectedIds(prev => prev.filter(id => id !== t.id));
                          }}
                        />
                        {t.status === "paid" ? (
                          <CheckCircle2 className="size-5 text-emerald-400" />
                        ) : (
                          <Circle className={`size-5 ${overdue ? "text-rose-400" : "text-foreground/30"}`} />
                        )}
                      </div>

                      <div className="col-span-3 min-w-0">
                        <div className="text-sm font-medium truncate flex items-center gap-2">
                          {t.description}
                          {(t.contract_id || t.proposal_id) && <LinkIcon className="size-3 text-foreground/40" />}
                        </div>
                        <Badge variant="outline" className={`text-[9px] mt-1 ${origin.tone}`}>{origin.label}</Badge>
                      </div>
                      <div className="col-span-2 text-xs text-foreground/60 truncate">{catName(t.category_id)}</div>
                      <div className="col-span-2 text-xs text-foreground/60 truncate">
                        {t.client_id ? (
                          <Link to="/clientes/$clientId" params={{ clientId: t.client_id }} className="hover:text-primary">
                            {clientName(t.client_id)}
                          </Link>
                        ) : "—"}
                      </div>
                      <div className={`col-span-1 text-right font-display font-semibold ${t.kind === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                        {t.kind === "income" ? "+" : "−"} {brl(Number(t.amount))}
                      </div>
                      <div className="col-span-1 text-xs text-foreground/60">
                        {new Date(t.due_date).toLocaleDateString("pt-BR")}
                        {overdue && <div className="text-[10px] text-rose-400">Em atraso</div>}
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-2">
                        {t.status !== "paid" ? (
                          <Button
                            size="sm"
                            onClick={() => setSettleTx(t)}
                            className="h-8 rounded-full bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs px-3"
                          >
                            Dar baixa
                          </Button>
                        ) : null}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 rounded-full">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            {t.status === "paid" && (
                              <DropdownMenuItem onClick={() => togglePaid.mutate({ id: t.id, paid: false })}>
                                <Clock className="size-4 mr-2" /> Reverter baixa
                              </DropdownMenuItem>
                            )}
                            
                            {t.recurrence_id && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-[10px] uppercase text-foreground/40 px-2 py-1">Recorrência</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setDeleteFutureRecurrenceId(t.recurrence_id)}>
                                  <Trash2 className="size-4 mr-2 text-rose-400" /> Excluir Parcelas Futuras
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTerminateRecurrenceId(t.recurrence_id)}>
                                  <XCircle className="size-4 mr-2 text-rose-400" /> Encerrar Recorrência
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleRecurrenceStatus.mutate({ id: t.recurrence_id!, status: 'paused' })}>
                                  <Pause className="size-4 mr-2" /> Pausar Recorrência
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-400" onClick={() => delTx.mutate(t.id)}>
                              <Trash2 className="size-4 mr-2" /> Excluir Lançamento
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* ============ RECORRÊNCIAS ============ */}
          <TabsContent value="recurrences" className="mt-6 space-y-6">
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border font-display font-semibold">
                Gestão de Recorrências
              </div>
              <div className="grid grid-cols-12 px-5 py-3 text-[11px] uppercase tracking-wide text-foreground/40 border-b border-border">
                <div className="col-span-3">Descrição</div>
                <div className="col-span-2">Início</div>
                <div className="col-span-2">Valor Base</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Parcelas</div>
                <div className="col-span-1 text-right">Ações</div>
              </div>
              {recurrences.length === 0 ? (
                <div className="p-12 text-center text-foreground/50 text-sm">Nenhuma recorrência ativa</div>
              ) : (
                recurrences.map((r) => {
                  const txsForRec = txs.filter(t => t.recurrence_id === r.id);
                  const paid = txsForRec.filter(t => t.status === 'paid').length;
                  const total = txsForRec.length;
                  
                  return (
                    <div key={r.id} className="grid grid-cols-12 px-5 py-4 items-center border-b border-border/40 last:border-b-0 hover:bg-foreground/[0.02] group">
                      <div className="col-span-3 min-w-0">
                        <div className="text-sm font-medium truncate">{r.description}</div>
                        {r.contract_id && (
                          <div className="text-[10px] text-primary flex items-center gap-1 mt-1">
                            <LinkIcon className="size-3" /> Contrato Vinculado
                          </div>
                        )}
                      </div>
                      <div className="col-span-2 text-xs text-foreground/60">
                        {new Date(r.start_date).toLocaleDateString("pt-BR")}
                      </div>
                      <div className="col-span-2 text-xs font-semibold">
                        {brl(Number(r.amount))}
                      </div>
                      <div className="col-span-2">
                        <Badge variant="outline" className={`text-[10px] capitalize ${
                          r.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          r.status === 'paused' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-foreground/10 text-foreground/40 border-border'
                        }`}>
                          {r.status === 'active' ? 'Ativa' : r.status === 'paused' ? 'Pausada' : 'Encerrada'}
                        </Badge>
                      </div>
                      <div className="col-span-2 text-xs text-foreground/60">
                        {paid}/{total} pagas
                      </div>
                      <div className="col-span-1 flex items-center justify-end gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 rounded-full">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Ações da Recorrência</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setDeleteFutureRecurrenceId(r.id)}>
                              <Trash2 className="size-4 mr-2 text-rose-400" /> Excluir Parcelas Futuras
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTerminateRecurrenceId(r.id)}>
                              <XCircle className="size-4 mr-2 text-rose-400" /> Encerrar Recorrência
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {r.status === 'active' ? (
                              <DropdownMenuItem onClick={() => toggleRecurrenceStatus.mutate({ id: r.id, status: 'paused' })}>
                                <Pause className="size-4 mr-2" /> Pausar
                              </DropdownMenuItem>
                            ) : r.status === 'paused' ? (
                              <DropdownMenuItem onClick={() => toggleRecurrenceStatus.mutate({ id: r.id, status: 'active' })}>
                                <Play className="size-4 mr-2" /> Reativar
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>



          {/* ============ VISÃO MENSAL ============ */}
          <TabsContent value="monthly" className="mt-6 space-y-6">
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-lg font-semibold">Receitas vs Despesas</h2>
                  <p className="text-xs text-foreground/50">Últimos 6 meses</p>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="label" stroke="hsl(var(--foreground))" opacity={0.6} fontSize={12} />
                    <YAxis stroke="hsl(var(--foreground))" opacity={0.6} fontSize={12} tickFormatter={(v) => `R$ ${Math.round(v / 1000)}k`} />
                    <Tooltip contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} formatter={(v: number) => brl(v)} />
                    <Legend />
                    <Bar dataKey="income" name="Receitas" fill="#22C55E" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" name="Despesas" fill="#EF4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-5">
              <h2 className="font-display text-lg font-semibold mb-4">Comparativo mensal</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-foreground/50 text-xs uppercase border-b border-border">
                    <tr>
                      <th className="text-left py-2">Mês</th>
                      <th className="text-right py-2">Receita</th>
                      <th className="text-right py-2">Despesa</th>
                      <th className="text-right py-2">Lucro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((m) => (
                      <tr key={m.label} className="border-b border-border/40">
                        <td className="py-2 font-medium">{m.label}</td>
                        <td className="py-2 text-right text-emerald-400">{brl(m.income)}</td>
                        <td className="py-2 text-right text-rose-400">{brl(m.expense)}</td>
                        <td className={`py-2 text-right font-semibold ${m.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{brl(m.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ============ PREVISÃO ANUAL ============ */}
          <TabsContent value="annual" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Kpi label="Receita Prevista (12m)" value={brl(forecastTotals.income)} tone="success" icon={<TrendingUp className="size-4" />} />
              <Kpi label="Despesa Prevista (12m)" value={brl(forecastTotals.expense)} tone="danger" icon={<TrendingDown className="size-4" />} />
              <Kpi label="Lucro Previsto (12m)" value={brl(forecastTotals.income - forecastTotals.expense)} tone={(forecastTotals.income - forecastTotals.expense) >= 0 ? "success" : "danger"} icon={<CircleDollarSign className="size-4" />} />
            </div>
            <div className="bg-surface border border-border rounded-2xl p-5">
              <h2 className="font-display text-lg font-semibold mb-4">Projeção 12 meses</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="label" stroke="hsl(var(--foreground))" opacity={0.6} fontSize={12} />
                    <YAxis stroke="hsl(var(--foreground))" opacity={0.6} fontSize={12} tickFormatter={(v) => `R$ ${Math.round(v / 1000)}k`} />
                    <Tooltip contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} formatter={(v: number) => brl(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="income" name="Receita" stroke="#22C55E" strokeWidth={2} />
                    <Line type="monotone" dataKey="expense" name="Despesa" stroke="#EF4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-foreground/50 mt-3">
                Inclui parcelas e recorrências já lançadas. Contratos ativos ({brl(indicators.mrr)}/mês) continuam gerando lançamentos conforme aprovações.
              </p>
            </div>
          </TabsContent>

          {/* ============ CONTAS BANCÁRIAS ============ */}
          <TabsContent value="accounts" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="bg-surface border border-primary/30 rounded-2xl px-5 py-3 flex items-center gap-3">
                <Wallet className="size-5 text-primary" />
                <div>
                  <div className="text-[10px] uppercase text-foreground/50">Saldo Consolidado</div>
                  <div className="font-display text-2xl font-bold text-primary">{brl(consolidated)}</div>
                </div>
              </div>
              <Button onClick={() => setOpenAcc(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full h-10 px-5 gap-2">
                <Plus className="size-4" /> Nova conta
              </Button>
            </div>
            {accounts.length === 0 ? (
              <div className="border border-dashed border-border/60 rounded-2xl p-12 text-center text-foreground/50 text-sm">
                Nenhuma conta bancária cadastrada.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map((a) => {
                  const stats = accountStats(a, txs);
                  return (
                    <div key={a.id} className="bg-surface border border-border rounded-2xl p-5 relative overflow-hidden">
                      <div className="absolute inset-x-0 top-0 h-1" style={{ background: a.color ?? "#FFBC45" }} />
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl grid place-items-center" style={{ background: `${a.color}22`, color: a.color ?? "#FFBC45" }}>
                          <Landmark className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-display font-semibold truncate">{a.name}</div>
                          <div className="text-xs text-foreground/50 truncate">
                            {[a.bank, a.agency && `Ag. ${a.agency}`, a.account_number && `CC ${a.account_number}`].filter(Boolean).join(" · ") || a.account_type}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 font-display text-2xl font-bold">{brl(stats.balance)}</div>
                      <div className="text-[10px] uppercase text-foreground/40 mt-1">Saldo atual</div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-emerald-500/10 p-2">
                          <div className="text-[10px] text-foreground/50">Entradas</div>
                          <div className="text-emerald-400 font-semibold">{brl(stats.income)}</div>
                        </div>
                        <div className="rounded-lg bg-rose-500/10 p-2">
                          <div className="text-[10px] text-foreground/50">Saídas</div>
                          <div className="text-rose-400 font-semibold">{brl(stats.expense)}</div>
                        </div>
                      </div>
                      <button onClick={() => delAcc.mutate(a.id)} className="mt-4 text-xs text-foreground/40 hover:text-rose-400 flex items-center gap-1">
                        <Trash2 className="size-3" /> Remover
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <NewTransactionDialog open={openTx !== false} onOpenChange={(o) => setOpenTx(o ? (openTx || "income") : false)} defaultKind={openTx || "income"} />
      <NewBankAccountDialog open={openAcc} onOpenChange={setOpenAcc} />
      <ImportTransactionsDialog open={openImport} onOpenChange={setOpenImport} />
      <SettleTransactionDialog tx={settleTx} open={!!settleTx} onOpenChange={(o) => !o && setSettleTx(null)} />
      
      <DeleteFutureInstallmentsDialog 
        recurrenceId={deleteFutureRecurrenceId} 
        onClose={() => setDeleteFutureRecurrenceId(null)} 
      />
      
      <TerminateRecurrenceDialog 
        recurrenceId={terminateRecurrenceId} 
        onClose={() => setTerminateRecurrenceId(null)} 
      />

    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "primary" | "success" | "danger" | "warning";
}) {
  const toneText =
    tone === "success" ? "text-emerald-400"
    : tone === "danger" ? "text-rose-400"
    : tone === "warning" ? "text-amber-400"
    : tone === "primary" ? "text-primary"
    : "text-foreground";
  const toneBg =
    tone === "success" ? "bg-emerald-500/10"
    : tone === "danger" ? "bg-rose-500/10"
    : tone === "warning" ? "bg-amber-500/10"
    : tone === "primary" ? "bg-primary/10"
    : "bg-foreground/5";
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-foreground/50">
        <span>{label}</span>
        {icon && <span className={`size-7 rounded-lg grid place-items-center ${toneBg} ${toneText}`}>{icon}</span>}
      </div>
      <div className={`mt-3 font-display text-xl lg:text-2xl font-bold ${toneText}`}>{value}</div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="col-span-6 md:col-span-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
