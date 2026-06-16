import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  fetchTransactions, 
  fetchFinanceStats, 
  fetchCategories, 
  updateTransaction,
  type Transaction
} from "@/lib/finance-api";
import { fetchClients } from "@/lib/ops-api";
import { brl } from "@/lib/utils-format";
import { cn } from "@/lib/utils";
import { FinancialImportDialog } from "@/components/finance/FinancialImportDialog";
import { TransactionFormDialog } from "@/components/finance/TransactionFormDialog";
import { CategoriesManagerDialog } from "@/components/finance/CategoriesManagerDialog";
import { ContasBancariasManagerDialog } from "@/components/finance/ContasBancariasManagerDialog";
import { EditTransactionDialog } from "@/components/finance/EditTransactionDialog";
import { BaixaDialog } from "@/components/finance/BaixaDialog";
import { FinancialRulesPanel } from "@/components/dashboard/FinancialRulesPanel";
import { InlineClientPicker } from "@/components/finance/InlineClientPicker";
import { InlineDuePicker } from "@/components/finance/InlineDuePicker";
import { InlineCategoryPicker } from "@/components/finance/InlineCategoryPicker";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar, 
  Filter, 
  Download, 
  Plus,
  Search,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Upload,
  Trash2,
  Settings,
  Landmark,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pencil,
  CreditCard,
} from "lucide-react";



import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";

const PRO_LABORE = "pro-labore";
const normalize = (s: string | null | undefined) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const isProLabore = (name: string | null | undefined) =>
  normalize(name) === PRO_LABORE;
const isInvestimento = (name: string | null | undefined) =>
  normalize(name).includes("investimento");

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Financeiro — KASA HUB" }] }),
  component: FinancialPage,
});

function FinancialPage() {
  const qc = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [contasOpen, setContasOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [baixaTx, setBaixaTx] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseDateBR = (raw: string): string | null => {
    if (!raw) return null;
    const s = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (m) {
      const [, d, mo, y] = m;
      const yyyy = y.length === 2 ? `20${y}` : y;
      return `${yyyy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
  };

  const parseAmountBR = (raw: any): number => {
    if (raw == null || raw === "") return 0;
    if (typeof raw === "number") return raw;
    const cleaned = String(raw)
      .replace(/r\$\s?/gi, "")
      .replace(/\s/g, "")
      .replace(/\.(?=\d{3}(\D|$))/g, "")
      .replace(",", ".");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };

  const mapType = (raw: any): "income" | "expense" | null => {
    const s = String(raw ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!s) return null;
    if (s.includes("receita") || s.includes("entrada") || s.includes("income") || s.includes("credito")) return "income";
    if (s.includes("despesa") || s.includes("saida") || s.includes("expense") || s.includes("debito")) return "expense";
    return null;
  };

  const mapStatus = (raw: any): "paid" | "pending" => {
    const s = String(raw || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return s.includes("pago") || s.includes("recebido") || s.includes("paid") || s.includes("liquidado") ? "paid" : "pending";
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const inputEl = event.target;

    const Papa = (await import("papaparse")).default;
    Papa.parse<Record<string, any>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data || [];
          if (!rows.length) {
            toast.error("Planilha vazia ou sem dados válidos.");
            inputEl.value = "";
            return;
          }

          const { supabase } = await import("@/integrations/supabase/client");

          // 1. Busca a conta bancária principal (primeira cadastrada).
          const { data: contas, error: erroConta } = await supabase
            .from("contas_bancarias")
            .select("id")
            .order("created_at", { ascending: true })
            .limit(1);

          if (erroConta || !contas || contas.length === 0) {
            toast.error(
              "Por favor, cadastre pelo menos uma Conta Bancária no sistema antes de importar a planilha.",
            );
            inputEl.value = "";
            return;
          }
          const contaPrincipalId = contas[0].id;

          const payload = rows
            .map((r) => {
              const getCol = (...keys: string[]) => {
                for (const k of keys) {
                  const found = Object.keys(r).find(
                    (rk) => rk.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() === k
                  );
                  if (found && r[found] != null && String(r[found]).trim() !== "") return r[found];
                }
                return null;
              };
              const due_date = parseDateBR(getCol("data", "data de vencimento", "vencimento"));
              const description = String(getCol("descricao", "descrição", "description") || "Importação");
              let amount = parseAmountBR(getCol("valor", "amount"));
              let type = mapType(getCol("tipo", "type"));

              // Fallback: infer type from amount sign when "Tipo" is missing/unrecognized
              if (!type) {
                if (amount > 0) type = "income";
                else if (amount < 0) type = "expense";
              }
              // Always store positive amounts
              if (amount < 0) amount = Math.abs(amount);

              const status = mapStatus(getCol("status", "situacao", "situação"));
              const category = getCol("categoria", "category");
              if (!due_date || !amount || !type) return null;
              return {
                description,
                amount,
                type,
                kind: type,
                status,
                due_date,
                category: category ? String(category) : null,
                payment_date: status === "paid" ? due_date : null,
                payment_method: "Importação",
                conta_id: contaPrincipalId,
              };
            })
            .filter(Boolean) as any[];

          console.log("Payload higienizado:", payload);

          if (!payload.length) {
            toast.error("Nenhuma linha válida encontrada. Verifique data e valor.");
            inputEl.value = "";
            return;
          }

          const { error } = await supabase.from("transactions").insert(payload);
          if (error) {
            toast.error("Erro na importação: " + error.message);
          } else {
            toast.success(`Importação concluída! ${payload.length} lançamentos adicionados com sucesso.`);
            qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["contas_bancarias"] });
            qc.invalidateQueries({ queryKey: ["finance-stats"] });
          }

        } catch (e: any) {
          toast.error("Erro ao processar arquivo: " + (e?.message || "desconhecido"));
        } finally {
          inputEl.value = "";
        }
      },
      error: (err) => {
        toast.error("Erro ao ler CSV: " + err.message);
        inputEl.value = "";
      },
    });
  };

  const handleDownloadTemplate = () => {
    const headers = ["Data", "Descrição", "Valor", "Tipo", "Categoria", "Status"];
    const example = ["2026-01-15", "Exemplo de lançamento", "1000.00", "Receita", "Fee Mensal", "Pago"];
    const csv = "\uFEFF" + [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo-fluxo-de-caixa.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const [filter, setFilter] = useState({
    clientId: "all",
    status: "all",
    type: "all",
    categoryId: "all",
    search: ""
  });
  const [quickFilter, setQuickFilter] = useState<"all" | "income" | "expense_op" | "pro_labore">("all");

  const periodFilters = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split("T")[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];
    return { startDate, endDate };
  }, [selectedDate]);

  const { data: stats } = useQuery({ 
    queryKey: ["finance-stats", periodFilters], 
    queryFn: () => fetchFinanceStats(periodFilters) 
  });
  
  const { data: transactions = [], isLoading } = useQuery({ 
    queryKey: ["transactions", { ...filter, ...periodFilters }], 
    queryFn: () => fetchTransactions({ ...filter, ...periodFilters }) 
  });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const nextMonth = () => {
    const next = new Date(selectedDate);
    next.setMonth(next.getMonth() + 1);
    setSelectedDate(next);
  };

  const prevMonth = () => {
    const prev = new Date(selectedDate);
    prev.setMonth(prev.getMonth() - 1);
    setSelectedDate(prev);
  };

  const currentMonthLabel = selectedDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  }).replace(/^\w/, (c) => c.toUpperCase());

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => 
      updateTransaction(id, { status: status as any, payment_date: status === "paid" ? new Date().toISOString().split("T")[0] : null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["contas_bancarias"] });
      qc.invalidateQueries({ queryKey: ["finance-stats"] });
      qc.invalidateQueries({ queryKey: ["saude-negocio"] });
      toast.success("Status atualizado");
    }

  });


  const getCatName = (t: any) => (t.categorias_financeiras as any)?.nome || t.category || "";

  const filteredTransactions = transactions.filter((t: any) => {
    const matchSearch =
      t.description.toLowerCase().includes(filter.search.toLowerCase()) ||
      (t.clients as any)?.company?.toLowerCase().includes(filter.search.toLowerCase()) ||
      (t.clients as any)?.name?.toLowerCase().includes(filter.search.toLowerCase());
    if (!matchSearch) return false;
    const proLab = isProLabore(getCatName(t));
    if (quickFilter === "income") return t.type === "income";
    if (quickFilter === "expense_op") return t.type === "expense" && !proLab;
    if (quickFilter === "pro_labore") return proLab;
    return true;
  });

  const proLaboreMes = transactions
    .filter((t: any) => t.type === "expense" && isProLabore(getCatName(t)))
    .reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);

  // Despesas reais operacionais: exclui Pró-labore e Investimento
  // (ambos contabilizados em blocos separados) e considera apenas as pagas.
  const despesasReaisOperacionais = transactions
    .filter(
      (t: any) =>
        t.type === "expense" &&
        !isProLabore(getCatName(t)) &&
        !isInvestimento(getCatName(t)) &&
        t.status === "paid",
    )
    .reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);

  const investimentoRealizado = transactions
    .filter(
      (t: any) =>
        t.type === "expense" &&
        isInvestimento(getCatName(t)) &&
        t.status === "paid",
    )
    .reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);

  const totals = filteredTransactions.reduce(
    (acc: { receitas: number; despesas: number; proLabore: number }, t: any) => {
      const v = Number(t.amount || 0);
      const proLab = isProLabore(getCatName(t));
      if (t.type === "income") acc.receitas += v;
      else if (t.type === "expense" && proLab) acc.proLabore += v;
      else if (t.type === "expense") acc.despesas += v;
      return acc;
    },
    { receitas: 0, despesas: 0, proLabore: 0 },
  );
  const saldoPeriodo = totals.receitas - totals.despesas - totals.proLabore;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto animate-reveal">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-primary text-[10px] font-mono-kasa uppercase font-bold tracking-wider">Gestão · Financeiro</span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight mt-1">Fluxo de Caixa</h1>
          <p className="text-foreground/50 text-xs lg:text-sm mt-1">Controle de receitas, despesas e previsibilidade.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full gap-2" onClick={() => setCategoriesOpen(true)}>
            <Settings className="size-4" /> Categorias
          </Button>
          <Button variant="outline" className="rounded-full gap-2" onClick={() => setContasOpen(true)}>
            <Landmark className="size-4" /> Contas
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-full gap-2">
                <FileSpreadsheet className="size-4" /> Importar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownloadTemplate}>
                <Download className="size-4 mr-2" /> Baixar Planilha Modelo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-4 mr-2" /> Fazer Upload de Dados
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={handleFileUpload}
          />

          <Button 
            className="rounded-full gap-2 bg-primary text-primary-foreground"
            onClick={() => setTransactionOpen(true)}
          >
            <Plus className="size-4" /> Novo Lançamento
          </Button>
        </div>
      </header>

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-6 bg-surface border border-border rounded-2xl p-4 shadow-sm animate-reveal">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={prevMonth}
          className="rounded-full hover:bg-primary/10 hover:text-primary transition-all"
        >
          <ChevronLeft className="size-6" />
        </Button>
        
        <div className="flex flex-col items-center min-w-[200px]">
          <span className="text-[10px] font-mono-kasa uppercase font-bold tracking-[0.2em] text-foreground/40 mb-1">Período de Referência</span>
          <h2 className="text-xl lg:text-2xl font-display font-bold tracking-tight text-primary">
            {currentMonthLabel}
          </h2>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={nextMonth}
          className="rounded-full hover:bg-primary/10 hover:text-primary transition-all"
        >
          <ChevronRight className="size-6" />
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard title="Receitas Previstas" value={stats?.previstasReceitas} icon={Clock} color="text-blue-500" />
        <StatCard title="Receitas Recebidas" value={stats?.recebidasReceitas} icon={TrendingUp} color="text-emerald-500" />
        <StatCard title="Parcelas Futuras" value={stats?.parcelasFuturas} icon={Calendar} color="text-primary" />
        <StatCard title="Despesas Previstas" value={stats?.previstasDespesas} icon={AlertCircle} color="text-amber-500" />
        <StatCard title="Despesas Pagas" value={stats?.pagasDespesas} icon={TrendingDown} color="text-red-500" />
        <StatCard title="Pró-labore (Mês)" value={proLaboreMes} icon={Wallet} color="text-indigo-500" />
      </div>

      <FinancialRulesPanel
        totalFaturamento={stats?.recebidasReceitas ?? 0}
        despesasReais={despesasReaisOperacionais}
        investimentoRealizado={investimentoRealizado}
        periodoLabel={currentMonthLabel}
      />

      {/* Quick Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          value={quickFilter}
          onValueChange={(v) => v && setQuickFilter(v as any)}
          className="bg-surface border border-border rounded-full p-1 gap-1"
        >
          <ToggleGroupItem value="all" className="rounded-full px-4 h-8 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            Todos
          </ToggleGroupItem>
          <ToggleGroupItem value="income" className="rounded-full px-4 h-8 text-xs data-[state=on]:bg-emerald-500 data-[state=on]:text-white">
            Receitas
          </ToggleGroupItem>
          <ToggleGroupItem value="expense_op" className="rounded-full px-4 h-8 text-xs data-[state=on]:bg-red-500 data-[state=on]:text-white">
            Despesas Operacionais
          </ToggleGroupItem>
          <ToggleGroupItem value="pro_labore" className="rounded-full px-4 h-8 text-xs data-[state=on]:bg-indigo-500 data-[state=on]:text-white">
            Pró-labore
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-2xl p-4 flex flex-wrap gap-4 items-end shadow-sm">
        <div className="flex-1 min-w-[200px] space-y-1.5">
          <label className="text-[10px] font-mono-kasa uppercase text-foreground/40 px-1">Busca</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground/30" />
            <Input 
              placeholder="Descrição ou cliente..." 
              className="pl-9 h-10 rounded-xl"
              value={filter.search}
              onChange={e => setFilter({ ...filter, search: e.target.value })}
            />
          </div>
        </div>
        <div className="w-full sm:w-48 space-y-1.5">
          <label className="text-[10px] font-mono-kasa uppercase text-foreground/40 px-1">Cliente</label>
          <Select value={filter.clientId} onValueChange={v => setFilter({ ...filter, clientId: v })}>
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Clientes</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-40 space-y-1.5">
          <label className="text-[10px] font-mono-kasa uppercase text-foreground/40 px-1">Status</label>
          <Select value={filter.status} onValueChange={v => setFilter({ ...filter, status: v })}>
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="overdue">Atrasado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-32 space-y-1.5">
          <label className="text-[10px] font-mono-kasa uppercase text-foreground/40 px-1">Tipo</label>
          <Select value={filter.type} onValueChange={v => setFilter({ ...filter, type: v })}>
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Ambos</SelectItem>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-4">Vencimento</TableHead>
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-4">Descrição / Cliente</TableHead>
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-4">Categoria</TableHead>
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-4 text-right">Previsto</TableHead>
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-4 text-right">Real</TableHead>
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-4 text-right">Diferença</TableHead>
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-4 text-center">Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="h-32 text-center text-foreground/30 italic">Carregando...</TableCell></TableRow>
            ) : filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3 opacity-40">
                    <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                      <Wallet className="size-8" />
                    </div>
                    <p className="font-display font-medium">Nenhum lançamento financeiro encontrado para {currentMonthLabel}.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((t: any) => {
                const previsto = Number(t.valor_previsto ?? t.amount ?? 0);
                const real = t.valor_real != null ? Number(t.valor_real) : null;
                const diff = real != null ? real - previsto : 0;
                const hasDiff = real != null && Math.abs(diff) > 0.005;
                const sign = t.type === "income" ? "+" : "-";
                const typeColor = t.type === "income" ? "text-emerald-500" : "text-red-500";
                return (
                <TableRow key={t.id} className="group hover:bg-muted/10 transition-colors">
                  <TableCell className="py-4">
                    <InlineDuePicker transactionId={t.id} currentDate={t.due_date} />
                    {t.payment_date && <div className="text-[10px] text-emerald-500 font-mono-kasa uppercase mt-1">Pago em {new Date(t.payment_date).toLocaleDateString("pt-BR")}</div>}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="font-semibold text-sm">{t.description}</div>
                    <InlineClientPicker
                      transactionId={t.id}
                      currentClientId={t.client_id}
                      currentClientName={
                        (t.clients as any)?.company || (t.clients as any)?.name || null
                      }
                    />
                  </TableCell>

                  <TableCell className="py-4">
                    <InlineCategoryPicker
                      transactionId={t.id}
                      currentCategoryId={t.category_id}
                      transactionType={t.type}
                    />
                  </TableCell>
                  <TableCell className={cn("py-4 text-right font-semibold text-sm tabular-nums", typeColor)}>
                    {sign} {brl(previsto)}
                  </TableCell>
                  <TableCell className={cn("py-4 text-right text-sm tabular-nums", real != null ? typeColor : "text-foreground/30")}>
                    {real != null ? `${sign} ${brl(real)}` : "—"}
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    {hasDiff ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                                diff > 0 ? "bg-orange-500 text-white" : "bg-emerald-500 text-white"
                              )}
                            >
                              {diff > 0 ? "+" : ""}
                              {brl(diff)}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <div className="font-semibold">{t.motivo_diferenca || "Sem motivo informado"}</div>
                              {t.observacao_diferenca && <div className="text-muted-foreground mt-1 max-w-[240px]">{t.observacao_diferenca}</div>}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-foreground/20 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-4 text-center">
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {t.status !== "paid" && (
                          <DropdownMenuItem onClick={() => setBaixaTx(t)} className="text-emerald-600 gap-2">
                            <CreditCard className="size-4" /> Dar Baixa
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setEditingTx(t)} className="gap-2">
                          <Pencil className="size-4" /> Editar
                        </DropdownMenuItem>
                        {t.status !== "paid" && (
                          <DropdownMenuItem onClick={() => statusMut.mutate({ id: t.id, status: "paid" })} className="text-emerald-500 gap-2">
                            <CheckCircle2 className="size-4" /> Marcar como Pago (rápido)
                          </DropdownMenuItem>
                        )}
                        {t.status === "paid" && (
                          <DropdownMenuItem onClick={() => statusMut.mutate({ id: t.id, status: "pending" })} className="gap-2">
                            <Clock className="size-4" /> Estornar para Pendente
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive gap-2">
                          <Trash2 className="size-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <div className="border-t border-border bg-muted/30 px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          <TotalCell label="Receitas" value={totals.receitas} className="text-emerald-600 dark:text-emerald-400" />
          <TotalCell label="Despesas" value={totals.despesas} className="text-red-600 dark:text-red-400" />
          <TotalCell label="Pró-labore" value={totals.proLabore} className="text-purple-600 dark:text-purple-400" />
          <TotalCell
            label="Saldo do Período"
            value={saldoPeriodo}
            className={saldoPeriodo >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
          />
        </div>
      </div>

      <FinancialImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <TransactionFormDialog open={transactionOpen} onOpenChange={setTransactionOpen} />
      <CategoriesManagerDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} />
      <ContasBancariasManagerDialog open={contasOpen} onOpenChange={setContasOpen} />
      <EditTransactionDialog
        open={!!editingTx}
        onOpenChange={(o) => !o && setEditingTx(null)}
        transaction={editingTx}
      />
      <BaixaDialog
        open={!!baixaTx}
        onOpenChange={(o) => !o && setBaixaTx(null)}
        transaction={baixaTx}
      />
    </div>

  );
}

function TotalCell({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/40">{label}</span>
      <span className={cn("text-base lg:text-lg font-bold tracking-tight tabular-nums", className)}>{brl(value)}</span>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string, value?: number, icon: any, color: string }) {
  return (
    <Card className="bg-surface border-border shadow-sm overflow-hidden group hover:border-primary/50 transition-colors">
      <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
        <div className="flex items-center justify-between">
          <div className="size-8 rounded-xl bg-muted flex items-center justify-center">
            <Icon className={cn("size-4", color)} />
          </div>
          {title !== 'PARCELAS FUTURAS' && (
            <Badge variant="outline" className="text-[10px] font-mono-kasa text-foreground/30">Mês Atual</Badge>
          )}
        </div>
        <div>
          <p className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/40">{title}</p>
          <h3 className="text-lg lg:text-xl font-bold tracking-tight mt-0.5">{brl(value || 0)}</h3>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string, cls: string }> = {
    pending: { label: "Pendente", cls: "border-blue-500/20 text-blue-500 bg-blue-500/5" },
    paid: { label: "Pago", cls: "border-emerald-500/20 text-emerald-500 bg-emerald-500/5" },
    overdue: { label: "Atrasado", cls: "border-red-500/20 text-red-500 bg-red-500/5" },
    cancelled: { label: "Cancelado", cls: "border-foreground/10 text-foreground/40 bg-foreground/5" }
  };
  const config = configs[status] || configs.pending;
  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border-2", config.cls)}>
      {config.label}
    </Badge>
  );
}
