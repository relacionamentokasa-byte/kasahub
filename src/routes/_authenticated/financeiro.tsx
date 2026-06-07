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
  XCircle,
  Calendar,
  Info,
  Filter,
  Check,
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
import { Label } from "@/components/ui/label";
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
  markPaid,
  bulkDeleteTransactions,
  bulkUpdateTransactions,
  updateTransaction,
  terminateContract,
} from "@/lib/finance-api";

import { fetchClients } from "@/lib/ops-api";
import { NewTransactionDialog } from "@/components/finance/NewTransactionDialog";
import { NewBankAccountDialog } from "@/components/finance/NewBankAccountDialog";
import { ImportTransactionsDialog } from "@/components/finance/ImportTransactionsDialog";
import { SettleTransactionDialog } from "@/components/finance/SettleTransactionDialog";
import type { Transaction } from "@/lib/finance-api";
import { toast } from "sonner";
import { DeleteTransactionCascadeDialog } from "@/components/finance/DeleteTransactionCascadeDialog";
import { TerminateContractDialog } from "@/components/finance/TerminateContractDialog";
import { TransactionAuditDialog } from "@/components/finance/TransactionAuditDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — KASA HUB" }] }),
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
  const [fOrigin, setFOrigin] = useState<string>("all");
  const [fValueRange, setFValueRange] = useState<[number, number]>([0, 100000]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (fKind !== "all") count++;
    if (fStatus !== "all") count++;
    if (fClient !== "all") count++;
    if (fCategory !== "all") count++;
    if (fAccount !== "all") count++;
    if (fOrigin !== "all") count++;
    if (fValueRange[0] > 0 || fValueRange[1] < 100000) count++;
    return count;
  }, [fKind, fStatus, fClient, fCategory, fAccount, fOrigin, fValueRange]);

  function clearFilters() {
    setFKind("all");
    setFStatus("all");
    setFClient("all");
    setFCategory("all");
    setFAccount("all");
    setFOrigin("all");
    setFValueRange([0, 100000]);
  }

  const [openTx, setOpenTx] = useState<false | "income" | "expense">(false);
  const [openAcc, setOpenAcc] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [settleTx, setSettleTx] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null);
  const [terminateContractId, setTerminateContractId] = useState<string | null>(null);
  const [auditTx, setAuditTx] = useState<Transaction | null>(null);

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

  const { data: indicators = {
    receitasPrevistas: 0,
    receitasRecebidas: 0,
    parcelasFuturas: 0,
    despesasPagas: 0,
    incomePaid: 0,
    expensePaid: 0,
    receivable: 0,
    payable: 0,
    profit: 0,
    mrr: 0,
    arr: 0,
    recurringIncome: 0,
    extraIncome: 0,
    ticketRecurrente: 0,
    ticketGeral: 0,
    monthIncome: 0,
    monthExpense: 0,
    monthResult: 0,
    extraThisMonth: 0,
    overdueCount: 0,
    overdueAmount: 0,
  } } = useQuery({
    queryKey: ["financial_indicators", period.from, period.to, txs.length, contracts.length],
    queryFn: () => computeIndicators(txs, contracts, period),
    placeholderData: (prev) => prev,
  });
  const consolidated = accounts.reduce((s, a) => s + accountBalance(a, txs), 0);

  const chartData = useMemo(() => cashflowByMonth(txs, 6), [txs]);
  const forecast = useMemo(() => annualForecast(txs, contracts), [txs, contracts]);
  const forecastTotals = forecast.reduce(
    (acc, m) => ({ income: acc.income + m.income, expense: acc.expense + m.expense }),
    { income: 0, expense: 0 },
  );

  const rows = useMemo(() => {
    return txs.filter((t) => {
      if (period.from && t.due_date < period.from) return false;
      if (period.to && t.due_date > period.to) return false;
      if (fKind !== "all" && t.kind !== fKind) return false;
      if (fStatus !== "all" && t.status !== fStatus) return false;
      if (fClient !== "all" && (t.client_id ?? "") !== fClient) return false;
      if (fCategory !== "all" && (t.category_id ?? "") !== fCategory) return false;
      if (fAccount !== "all" && (t.account_id ?? "") !== fAccount) return false;
      
      const originLabel = t.contract_id ? "contract" : t.dme_id ? "dme" : t.proposal_id ? "proposal" : "manual";
      if (fOrigin !== "all" && originLabel !== fOrigin) return false;
      
      const val = Number(t.amount);
      if (val < fValueRange[0] || val > fValueRange[1]) return false;

      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [txs, period, fKind, fStatus, fClient, fCategory, fAccount, fOrigin, fValueRange, search]);

  const togglePaid = useMutation({
    mutationFn: ({ id, paid }: { id: string; paid: boolean }) => markPaid(id, paid),
    onMutate: async ({ id, paid }) => {
      await qc.cancelQueries({ queryKey: ["transactions"] });
      const previous = qc.getQueryData<Transaction[]>(["transactions"]);
      if (previous) {
        qc.setQueryData(["transactions"], previous.map(t => 
          t.id === id ? { ...t, status: paid ? 'paid' : 'pending', paid_at: paid ? new Date().toISOString().slice(0,10) : null } : t
        ));
      }
      return { previous };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
    onError: (e: Error, _, context) => {
      if (context?.previous) qc.setQueryData(["transactions"], context.previous);
      toast.error(e.message);
    },
  });

  const delTx = useMutation({
    mutationFn: ({ id, cascade }: { id: string; cascade?: boolean }) => deleteTransaction(id, cascade),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ["transactions"] });
      const previous = qc.getQueryData<Transaction[]>(["transactions"]);
      if (previous) {
        qc.setQueryData(["transactions"], previous.filter(t => t.id !== id));
      }
      return { previous };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["contract"] });
      setDeleteTxId(null);
      toast.success("Lançamento removido");
    },
    onError: (e: Error, _, context) => {
      if (context?.previous) qc.setQueryData(["transactions"], context.previous);
      toast.error(e.message);
    },
  });

  const updateTx = useMutation({
    mutationFn: ({ id, patch, cascade }: { id: string; patch: any; cascade?: boolean }) => 
      updateTransaction(id, patch, cascade),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["transactions"] });
      const previous = qc.getQueryData<Transaction[]>(["transactions"]);
      if (previous) {
        qc.setQueryData(["transactions"], previous.map(t => t.id === id ? { ...t, ...patch } : t));
      }
      return { previous };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Lançamento atualizado");
    },
    onError: (e: Error, _, context) => {
      if (context?.previous) qc.setQueryData(["transactions"], context.previous);
      toast.error(e.message);
    },
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

  const terminateContractMutation = useMutation({
    mutationFn: ({ id, cleanup }: { id: string; cleanup: "keep" | "cancel" | "delete" }) => 
      terminateContract(id, cleanup),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contrato encerrado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const monthly = chartData.map((m) => ({ ...m, profit: m.income - m.expense }));

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 lg:px-10 pt-6 pb-4 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-xl lg:text-3xl font-bold tracking-tight">
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

      <div className="flex-1 overflow-y-auto px-6 lg:px-10 pb-20 md:pb-10">
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="bg-surface border border-border">
            <TabsTrigger value="list" className="gap-2"><List className="size-4" /> Lista</TabsTrigger>
            <TabsTrigger value="monthly" className="gap-2"><BarChart3 className="size-4" /> Visão Mensal</TabsTrigger>
            <TabsTrigger value="annual" className="gap-2"><LineIcon className="size-4" /> Previsão Anual</TabsTrigger>
            <TabsTrigger value="accounts" className="gap-2"><Landmark className="size-4" /> Contas Banc.</TabsTrigger>
          </TabsList>

          {/* ============ LISTA ============ */}
          <TabsContent value="list" className="mt-6 space-y-6">
            <div className="flex items-center justify-between bg-surface border border-border rounded-2xl px-4 py-3">
              <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
                <ChevronLeft className="size-4" />
              </Button>
              <div className="font-display text-lg font-semibold capitalize">{monthLabel}</div>
              <Button variant="outline" size="icon" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
                <ChevronRight className="size-4" />
              </Button>
            </div>

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
                        const selectedContractIds = Array.from(new Set(
                          rows.filter(r => selectedIds.includes(r.id) && r.contract_id)
                              .map(r => r.contract_id)
                        )) as string[];

                        if (selectedContractIds.length > 0) {
                          setTerminateContractId(selectedContractIds[0]);
                          if (selectedContractIds.length > 1) {
                            toast.info("Múltiplas contratos selecionados. Agindo sobre o primeiro encontrado.");
                          }
                        } else {
                          toast.error("Nenhum contrato identificado nos itens selecionados");
                        }
                      }}>
                        <XCircle className="size-4 mr-2" /> Encerrar Contrato
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Kpi label="Receitas Previstas" value={brl(indicators.receitasPrevistas)} tone="primary" icon={<Clock className="size-4" />} />
              <Kpi label="Receitas Recebidas" value={brl(indicators.receitasRecebidas)} tone="success" icon={<TrendingUp className="size-4" />} />
              <Kpi label="Parcelas Futuras" value={brl(indicators.parcelasFuturas)} tone="warning" icon={<CircleDollarSign className="size-4" />} />
              <Kpi label="Despesas Pagas" value={brl(indicators.despesasPagas)} tone="danger" icon={<TrendingDown className="size-4" />} />
            </div>

            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Buscar..." className="pl-9 h-11 rounded-xl" />
              </div>
              
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="h-11 rounded-xl px-5 gap-2 border-border/60 hover:border-primary/40 transition-all">
                    <Filter className="size-4" /> 
                    ⚙️ Filtros
                    {activeFiltersCount > 0 && (
                      <Badge className="ml-1 bg-primary text-primary-foreground h-5 px-1.5 min-w-[20px] justify-center">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-surface border-border w-full sm:max-w-md p-0 overflow-hidden flex flex-col">
                  <SheetHeader className="px-6 py-5 border-b border-border bg-surface sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                      <SheetTitle className="text-xl font-display font-bold">Configurar Filtros</SheetTitle>
                      {activeFiltersCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
                          Limpar tudo
                        </Button>
                      )}
                    </div>
                  </SheetHeader>
                  <ScrollArea className="flex-1 px-6">
                    <div className="py-6 space-y-8">
                      {/* Tipo e Status */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[11px] uppercase tracking-wider text-foreground/40 font-bold">Tipo</Label>
                          <Select value={fKind} onValueChange={setFKind}>
                            <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos Tipos</SelectItem>
                              <SelectItem value="income">Receitas</SelectItem>
                              <SelectItem value="expense">Despesas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[11px] uppercase tracking-wider text-foreground/40 font-bold">Status</Label>
                          <Select value={fStatus} onValueChange={setFStatus}>
                            <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos Status</SelectItem>
                              <SelectItem value="paid">Pagas</SelectItem>
                              <SelectItem value="pending">Pendentes</SelectItem>
                              <SelectItem value="cancelled">Canceladas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Cliente */}
                      <div className="space-y-2">
                        <Label className="text-[11px] uppercase tracking-wider text-foreground/40 font-bold">Cliente</Label>
                        <Select value={fClient} onValueChange={setFClient}>
                          <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos Clientes</SelectItem>
                            {clients.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Categoria */}
                      <div className="space-y-2">
                        <Label className="text-[11px] uppercase tracking-wider text-foreground/40 font-bold">Categoria</Label>
                        <Select value={fCategory} onValueChange={setFCategory}>
                          <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas categorias</SelectItem>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Conta */}
                      <div className="space-y-2">
                        <Label className="text-[11px] uppercase tracking-wider text-foreground/40 font-bold">Conta Bancária</Label>
                        <Select value={fAccount} onValueChange={setFAccount}>
                          <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas contas</SelectItem>
                            {accounts.map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Origem */}
                      <div className="space-y-2">
                        <Label className="text-[11px] uppercase tracking-wider text-foreground/40 font-bold">Origem</Label>
                        <Select value={fOrigin} onValueChange={setFOrigin}>
                          <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas origens</SelectItem>
                            <SelectItem value="contract">Contrato Recorrente</SelectItem>
                            <SelectItem value="dme">DME (Extra)</SelectItem>
                            <SelectItem value="proposal">Proposta</SelectItem>
                            <SelectItem value="manual">Lançamento Manual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Faixa de Valor */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] uppercase tracking-wider text-foreground/40 font-bold">Faixa de Valor</Label>
                          <span className="text-xs font-mono text-primary font-bold">
                            {brl(fValueRange[0])} - {fValueRange[1] === 100000 ? 'Máx.' : brl(fValueRange[1])}
                          </span>
                        </div>
                        <Slider 
                          defaultValue={[0, 100000]} 
                          max={100000} 
                          step={100} 
                          value={fValueRange} 
                          onValueChange={(v) => setFValueRange(v as [number, number])} 
                          className="py-4"
                        />
                      </div>
                    </div>
                  </ScrollArea>
                  <div className="p-6 border-t border-border bg-surface sticky bottom-0 z-10">
                    <Button className="w-full rounded-xl h-11 font-bold" onClick={() => {
                      const closeBtn = document.querySelector('[data-radix-collection-item]') as HTMLElement;
                      if (closeBtn) closeBtn.click();
                    }}>
                      <Check className="size-4 mr-2" /> Aplicar Filtros
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border font-display font-semibold flex items-center justify-between">
                <div>Lançamentos de {monthLabelShort}</div>
                {txs.length === 0 && <span className="text-xs font-normal text-foreground/40 italic">Carregando dados...</span>}
              </div>
              
              {/* Desktop Header */}
              <div className="hidden lg:grid grid-cols-[40px_100px_minmax(200px,1.2fr)_140px_180px_130px_145px_90px] px-3 py-2 text-[10px] uppercase tracking-wide text-foreground/40 border-b border-border items-center gap-3">
                <div className="flex items-center justify-center">
                  <Checkbox 
                    checked={rows.length > 0 && selectedIds.length === rows.length} 
                    onCheckedChange={(checked) => setSelectedIds(checked ? rows.map(r => r.id) : [])} 
                  />
                </div>
                <div>Status</div>
                <div>Descrição</div>
                <div>Categoria</div>
                <div>Cliente</div>
                <div className="text-right">Valor</div>
                <div className="text-center">Vencimento</div>
                <div className="text-right">Ações</div>
              </div>

              {rows.length === 0 ? (
                <div className="p-12 text-center text-foreground/50 text-sm">Nenhum lançamento neste mês</div>
              ) : (
                <div className="divide-y divide-border/40">
                  {rows.map((t) => {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    const overdue = t.status === "pending" && t.due_date < todayStr;
                    const origin = t.contract_id
                      ? { label: "Contrato", tone: "text-primary border-primary/40" }
                      : t.installment_total && t.installment_total > 1
                      ? { label: `Parcela ${t.installment_number}/${t.installment_total}`, tone: "text-blue-300 border-blue-500/40" }
                      : t.proposal_id
                      ? { label: "Proposta", tone: "text-purple-300 border-purple-500/40" }
                      : { label: "Manual", tone: "text-foreground/40 border-border" };

                    return (
                      <div key={t.id} className="group hover:bg-foreground/[0.02] transition-colors">
                        {/* Desktop Row */}
                        <div className="hidden lg:grid grid-cols-[40px_100px_minmax(200px,1.2fr)_140px_180px_130px_145px_90px] px-3 py-3 items-center gap-3">
                          <div className="flex items-center justify-center">
                            <Checkbox 
                              checked={selectedIds.includes(t.id)} 
                              onCheckedChange={(checked) => setSelectedIds(prev => checked ? [...prev, t.id] : prev.filter(id => id !== t.id))} 
                            />
                          </div>
                          
                          <div>
                            {t.status === "paid" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 gap-1 px-1.5 py-0.5 text-[10px]">
                                <CheckCircle2 className="size-3" /> Pago
                              </Badge>
                            ) : (
                              <Badge variant="outline" className={`${overdue ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-foreground/5 text-foreground/50 border-border"} gap-1 px-1.5 py-0.5 text-[10px]`}>
                                <Circle className="size-3" /> {overdue ? "Atrasado" : "Pendente"}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="font-medium text-xs truncate max-w-full" title={t.description}>
                            {t.description}
                          </div>

                          <div className="text-[11px] text-foreground/60 truncate">
                            <Select 
                              value={t.category_id || ""} 
                              onValueChange={(newCatId) => {
                                if (t.contract_id) {
                                  const cascade = window.confirm("Deseja aplicar esta alteração de categoria também aos próximos lançamentos deste contrato?");
                                  updateTx.mutate({ id: t.id, patch: { category_id: newCatId }, cascade });
                                } else {
                                  updateTx.mutate({ id: t.id, patch: { category_id: newCatId } });
                                }
                              }}
                            >
                              <SelectTrigger className="h-7 bg-transparent border-none hover:bg-foreground/5 transition-colors p-0 focus:ring-0 focus:ring-offset-0 text-[11px] justify-start group">
                                <div className="truncate pr-2">
                                  {catName(t.category_id)}
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((c) => (
                                  <SelectItem key={c.id} value={c.id} className="text-[11px]">
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="text-[11px] font-semibold text-foreground/70 truncate">
                            {clientName(t.client_id)}
                          </div>

                          <div className={`text-sm font-bold text-right ${t.kind === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {brl(t.amount)}
                          </div>

                          <div className="flex flex-col items-center justify-center">
                            <div className="relative group/date w-full flex items-center justify-center">
                              <Calendar className="size-3 absolute left-1.5 text-foreground/30 pointer-events-none group-hover/date:text-primary transition-colors" />
                              <input 
                                type="date" 
                                value={t.due_date} 
                                onChange={(e) => {
                                  const newDate = e.target.value;
                                  if (!newDate) return;
                                  if (t.contract_id) {
                                    const cascade = window.confirm("Deseja aplicar esta alteração de data também aos próximos vencimentos deste contrato?");
                                    updateTx.mutate({ id: t.id, patch: { due_date: newDate }, cascade });
                                  } else {
                                    updateTx.mutate({ id: t.id, patch: { due_date: newDate } });
                                  }
                                }}
                                className="bg-surface/50 border border-border/50 hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-md py-1 pl-6 pr-1 text-[11px] w-[115px] text-center cursor-pointer transition-all outline-none font-medium"
                              />
                            </div>
                            {overdue && <div className="text-[9px] font-bold text-rose-400 uppercase tracking-tighter mt-1">Vencido</div>}
                          </div>

                          <div className="flex items-center justify-end gap-2">
                            {t.status !== "paid" && (
                              <Button 
                                size="sm" 
                                onClick={() => setSettleTx(t)} 
                                className="h-7 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-[10px] font-bold uppercase px-3 transition-all"
                              >
                                Baixar
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8 rounded-full hover:bg-foreground/10"><MoreHorizontal className="size-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                {t.status === "paid" && (
                                  <DropdownMenuItem onClick={() => togglePaid.mutate({ id: t.id, paid: false })}><Clock className="size-4 mr-2" /> Reverter baixa</DropdownMenuItem>
                                )}
                                {t.contract_id && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel className="text-[10px] uppercase text-foreground/40 px-2 py-1">Contrato</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setTerminateContractId(t.contract_id)}><XCircle className="size-4 mr-2 text-rose-400" /> Encerrar Contrato</DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setAuditTx(t)}><Info className="size-4 mr-2" /> Detalhes e Auditoria</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-rose-400" onClick={() => setDeleteTxId(t.id)}><Trash2 className="size-4 mr-2" /> Excluir Lançamento</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Mobile/Tablet Card */}
                        <div className="lg:hidden p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox 
                                checked={selectedIds.includes(t.id)} 
                                onCheckedChange={(checked) => setSelectedIds(prev => checked ? [...prev, t.id] : prev.filter(id => id !== t.id))} 
                              />
                              {t.status === "paid" ? (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Pago</Badge>
                              ) : (
                                <Badge variant="outline" className={`${overdue ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-foreground/5 text-foreground/50 border-border"} text-[10px]`}>
                                  {overdue ? "Atrasado" : "Pendente"}
                                </Badge>
                              )}
                            </div>
                            <div className={`font-display font-bold ${t.kind === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                              {brl(Number(t.amount))}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-medium flex items-center gap-2">
                              {t.description}
                              {(t.contract_id || t.proposal_id) && <LinkIcon className="size-3 text-foreground/40" />}
                            </div>
                            <div className="text-xs text-foreground/50 mt-1 flex flex-wrap items-center gap-2">
                              <span className="bg-foreground/5 px-1.5 py-0.5 rounded border border-border/50">{catName(t.category_id)}</span>
                              <span className="text-foreground/20">•</span>
                              <span className="bg-foreground/5 px-1.5 py-0.5 rounded border border-border/50">{clientName(t.client_id)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/40">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-foreground/40 uppercase font-semibold flex items-center gap-1">
                                <Calendar className="size-2.5" /> Vencimento
                              </span>
                              <input 
                                type="date" 
                                value={t.due_date} 
                                onChange={(e) => {
                                  const newDate = e.target.value;
                                  if (!newDate) return;
                                  if (t.contract_id) {
                                    const cascade = window.confirm("Deseja aplicar esta alteração de data também aos próximos vencimentos deste contrato?");
                                    updateTx.mutate({ id: t.id, patch: { due_date: newDate }, cascade });
                                  } else {
                                    updateTx.mutate({ id: t.id, patch: { due_date: newDate } });
                                  }
                                }}
                                className="bg-surface/50 border border-border/50 rounded-md py-1 px-2 text-xs w-full text-left cursor-pointer transition-all outline-none font-medium hover:border-primary/50"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              {t.status !== "paid" && (
                                <Button 
                                  size="sm" 
                                  onClick={() => setSettleTx(t)} 
                                  className="h-8 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs"
                                >
                                  Baixar
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8 rounded-full"><MoreHorizontal className="size-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setAuditTx(t)}><Info className="size-4 mr-2" /> Detalhes</DropdownMenuItem>
                                  <DropdownMenuItem className="text-rose-400" onClick={() => setDeleteTxId(t.id)}><Trash2 className="size-4 mr-2" /> Excluir</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
              <p className="text-xs text-foreground/50 mt-3">Inclui parcelas e lançamentos automáticos. Contratos ativos continuam gerando lançamentos conforme o plano contratado.</p>
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
              <Button onClick={() => setOpenAcc(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full h-10 px-5 gap-2"><Plus className="size-4" /> Nova conta</Button>
            </div>
            {accounts.length === 0 ? (
              <div className="border border-dashed border-border/60 rounded-2xl p-12 text-center text-foreground/50 text-sm">Nenhuma conta bancária cadastrada.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map((a) => {
                  const stats = accountStats(a, txs);
                  return (
                    <div key={a.id} className="bg-surface border border-border rounded-2xl p-5 relative overflow-hidden">
                      <div className="absolute inset-x-0 top-0 h-1" style={{ background: a.color ?? "#FFBC45" }} />
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl grid place-items-center" style={{ background: `${a.color}22`, color: a.color ?? "#FFBC45" }}><Landmark className="size-5" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="font-display font-semibold truncate">{a.name}</div>
                          <div className="text-xs text-foreground/50 truncate">{[a.bank, a.agency && `Ag. ${a.agency}`, a.account_number && `CC ${a.account_number}`].filter(Boolean).join(" · ") || a.account_type}</div>
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
                      <button onClick={() => delAcc.mutate(a.id)} className="mt-4 text-xs text-foreground/40 hover:text-rose-400 flex items-center gap-1"><Trash2 className="size-3" /> Remover</button>
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
      
      <DeleteTransactionCascadeDialog
        transactionId={deleteTxId}
        onClose={() => setDeleteTxId(null)}
        onConfirm={(cascade) => delTx.mutate({ id: deleteTxId!, cascade })}
        isPending={delTx.isPending}
      />
      
      <TerminateContractDialog 
        contractId={terminateContractId} 
        onClose={() => setTerminateContractId(null)} 
        title="Encerrar Contrato"
        description="Deseja cancelar automaticamente todos os lançamentos financeiros futuros vinculados a este contrato?"
        onConfirm={async (mode: "keep" | "cancel" | "delete") => terminateContractMutation.mutateAsync({ id: terminateContractId!, cleanup: mode })}
      />

      <TransactionAuditDialog 
        transaction={auditTx} 
        open={!!auditTx} 
        onOpenChange={(open) => !open && setAuditTx(null)} 
      />
    </div>
  );
}

function Kpi({ label, value, icon, tone }: { label: string; value: string; icon?: React.ReactNode; tone?: "primary" | "success" | "danger" | "warning"; }) {
  const toneText = tone === "success" ? "text-emerald-400" : tone === "danger" ? "text-rose-400" : tone === "warning" ? "text-amber-400" : tone === "primary" ? "text-primary" : "text-foreground";
  const toneBg = tone === "success" ? "bg-emerald-500/10" : tone === "danger" ? "bg-rose-500/10" : tone === "warning" ? "bg-amber-500/10" : tone === "primary" ? "bg-primary/10" : "bg-foreground/5";
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

function FilterSelect({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: { value: string; label: string }[]; }) {
  return (
    <div className="col-span-6 md:col-span-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );
}
