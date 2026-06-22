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
import { SuppliersManagerDialog } from "@/components/finance/SuppliersManagerDialog";

import { BaixaDialog } from "@/components/finance/BaixaDialog";
import { DeleteTransactionDialog } from "@/components/finance/DeleteTransactionDialog";
import { EmitirBoletoDialog } from "@/components/finance/EmitirBoletoDialog";
import { ReciboDialog } from "@/components/finance/ReciboDialog";
import { FinancialRulesPanel } from "@/components/dashboard/FinancialRulesPanel";
import { InlineClientPicker } from "@/components/finance/InlineClientPicker";
import { InlineSupplierPicker } from "@/components/finance/InlineSupplierPicker";
import { InlineFreelancerPicker } from "@/components/finance/InlineFreelancerPicker";
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
  Barcode,
  Receipt,
  Home,
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
import { TableRowsSkeleton } from "@/components/ui/loading-skeletons";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
const formatDateOnlyBR = (date: string | null | undefined) =>
  date ? new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR") : "";

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
  const [suppliersOpen, setSuppliersOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [baixaTx, setBaixaTx] = useState<any | null>(null);
  const [deletingTx, setDeletingTx] = useState<any | null>(null);
  const [boletoTx, setBoletoTx] = useState<any | null>(null);
  const [reciboTx, setReciboTx] = useState<any | null>(null);
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
  const [quickChip, setQuickChip] = useState<"none" | "today" | "week" | "overdue" | "paid_month">("none");
  const [showCancelled, setShowCancelled] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);

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
    mutationFn: ({ id, status }: { id: string, status: string }) => {
      const d = new Date();
      const todayLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];
      return updateTransaction(id, { status: status as any, payment_date: status === "paid" ? todayLocal : null });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["contas_bancarias"] });
      qc.invalidateQueries({ queryKey: ["finance-stats"] });
      qc.invalidateQueries({ queryKey: ["saude-negocio"] });
      toast.success("Status atualizado");
    }

  });

  const todayStrLocal = (() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  })();

  const bulkBaixaMut = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("transactions")
        .update({ status: "paid" as any, payment_date: todayStrLocal })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, ids) => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["finance-stats"] });
      qc.invalidateQueries({ queryKey: ["contas_bancarias"] });
      qc.invalidateQueries({ queryKey: ["saude-negocio"] });
      toast.success(`${ids.length} lançamento(s) dados como pagos`);
      setSelectedIds(new Set());
    },
    onError: (e: any) => toast.error("Erro: " + (e?.message || "")),
  });

  const bulkCancelMut = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("transactions")
        .update({ status: "cancelled" as any })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, ids) => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["finance-stats"] });
      qc.invalidateQueries({ queryKey: ["saude-negocio"] });
      toast.success(`${ids.length} lançamento(s) cancelados`);
      setSelectedIds(new Set());
    },
    onError: (e: any) => toast.error("Erro: " + (e?.message || "")),
  });

  const bulkCategoryMut = useMutation({
    mutationFn: async ({ ids, categoryId }: { ids: string[]; categoryId: string }) => {
      const { error } = await supabase
        .from("transactions")
        .update({ category_id: categoryId })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["finance-stats"] });
      toast.success(`Categoria aplicada a ${vars.ids.length} lançamento(s)`);
      setSelectedIds(new Set());
      setBulkCategoryOpen(false);
    },
    onError: (e: any) => toast.error("Erro: " + (e?.message || "")),
  });

  const getCatName = (t: any) => (t.categorias_financeiras as any)?.nome || t.category || "";

  const weekFromTodayStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  })();

  const filteredTransactions = transactions.filter((t: any) => {
    if (!showCancelled && t.status === "cancelled") return false;
    const matchSearch =
      t.description.toLowerCase().includes(filter.search.toLowerCase()) ||
      (t.clients as any)?.company?.toLowerCase().includes(filter.search.toLowerCase()) ||
      (t.clients as any)?.name?.toLowerCase().includes(filter.search.toLowerCase());
    if (!matchSearch) return false;
    const proLab = isProLabore(getCatName(t));
    if (quickFilter === "income" && t.type !== "income") return false;
    if (quickFilter === "expense_op" && !(t.type === "expense" && !proLab)) return false;
    if (quickFilter === "pro_labore" && !proLab) return false;

    if (quickChip === "today") {
      if ((t.due_date || "").slice(0, 10) !== todayStrLocal) return false;
    } else if (quickChip === "week") {
      const d = (t.due_date || "").slice(0, 10);
      if (!d || d < todayStrLocal || d > weekFromTodayStr) return false;
    } else if (quickChip === "overdue") {
      if (t.status !== "pending" || !t.due_date || t.due_date >= todayStrLocal) return false;
    } else if (quickChip === "paid_month") {
      if (t.status !== "paid") return false;
    }
    return true;
  }).sort((a: any, b: any) => (a.due_date || "").localeCompare(b.due_date || ""));


  const cancelledCount = transactions.filter((t: any) => t.status === "cancelled").length;

  const proLaboreMes = transactions
    .filter((t: any) => t.type === "expense" && isProLabore(getCatName(t)))
    .reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);

  // Projeção: considera tudo que está previsto no mês (pagos + pendentes),
  // excluindo Pró-labore e Investimento (contabilizados em blocos separados).
  const despesasReaisOperacionais = transactions
    .filter(
      (t: any) =>
        t.type === "expense" &&
        t.nature !== "nao_operacional" &&
        !isProLabore(getCatName(t)) &&
        !isInvestimento(getCatName(t)),
    )
    .reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);

  const investimentoRealizado = transactions
    .filter(
      (t: any) =>
        t.type === "expense" &&
        isInvestimento(getCatName(t)),
    )
    .reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);

  const totals = filteredTransactions.reduce(
    (acc: { receitas: number; despesas: number; proLabore: number; naoOperacional: number }, t: any) => {
      const v = Number(t.amount || 0);
      const proLab = isProLabore(getCatName(t));
      const isNaoOp = t.nature === "nao_operacional";
      if (t.type === "income") {
        if (isNaoOp) acc.naoOperacional += v;
        else acc.receitas += v;
      } else if (t.type === "expense" && proLab) {
        acc.proLabore += v;
      } else if (t.type === "expense") {
        if (isNaoOp) acc.naoOperacional += v;
        else acc.despesas += v;
      }
      return acc;
    },
    { receitas: 0, despesas: 0, proLabore: 0, naoOperacional: 0 },
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
          <Button variant="outline" className="rounded-full gap-2" onClick={() => setSuppliersOpen(true)}>
            <Settings className="size-4" /> Fornecedores
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Receitas Previstas" value={stats?.previstasReceitas} icon={Clock} color="text-blue-600 dark:text-blue-400" bg="bg-blue-500/10" cardBg="bg-blue-500/5 border-blue-500/20" />
        <StatCard title="Receitas Recebidas" value={stats?.recebidasReceitas} icon={TrendingUp} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500/10" cardBg="bg-emerald-500/5 border-emerald-500/20" />
        <StatCard title="Despesas Previstas" value={stats?.previstasDespesas} icon={AlertCircle} color="text-amber-600 dark:text-amber-400" bg="bg-amber-500/10" cardBg="bg-amber-500/5 border-amber-500/20" />
        <StatCard title="Despesas Pagas" value={stats?.pagasDespesas} icon={TrendingDown} color="text-red-600 dark:text-red-400" bg="bg-red-500/10" cardBg="bg-red-500/5 border-red-500/20" />
        <StatCard title="Pró-labore (Mês)" value={proLaboreMes} icon={Wallet} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-500/10" cardBg="bg-indigo-500/5 border-indigo-500/20" />
      </div>

      <FinancialRulesPanel
        totalFaturamento={stats?.recebidasReceitas ?? 0}
        faturamentoPrevisto={(stats?.previstasReceitas ?? 0) + (stats?.recebidasReceitas ?? 0)}
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

        {cancelledCount > 0 && (
          <button
            type="button"
            onClick={() => setShowCancelled((v) => !v)}
            className={cn(
              "ml-auto inline-flex items-center gap-2 text-xs px-3 h-9 rounded-full border transition-colors",
              showCancelled
                ? "border-foreground/20 bg-foreground/5 text-foreground/70"
                : "border-border text-foreground/50 hover:text-foreground hover:border-foreground/30",
            )}
            title={showCancelled ? "Ocultar cancelados" : "Mostrar cancelados"}
          >
            <span className={cn("size-1.5 rounded-full", showCancelled ? "bg-foreground/40" : "bg-foreground/20")} />
            {showCancelled ? "Ocultar" : "Mostrar"} cancelados ({cancelledCount})
          </button>
        )}
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

      {/* Quick chips */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "none", label: "Tudo" },
          { id: "today", label: "Hoje" },
          { id: "week", label: "Próx. 7 dias" },
          { id: "overdue", label: "Atrasados" },
          { id: "paid_month", label: "Pagos do mês" },
        ].map((c) => {
          const active = quickChip === (c.id as any);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setQuickChip(c.id as any)}
              className={cn(
                "text-xs px-3 h-8 rounded-full border transition-colors font-medium",
                active
                  ? c.id === "overdue"
                    ? "bg-red-600 text-white border-red-600"
                    : c.id === "paid_month"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-primary text-primary-foreground border-primary"
                  : "border-border text-foreground/60 hover:text-foreground hover:border-foreground/30 bg-surface",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-3 bg-primary text-primary-foreground rounded-2xl px-4 py-3 shadow-lg animate-reveal">
          <span className="text-sm font-semibold">
            {selectedIds.size} selecionado(s)
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full gap-1.5 h-8"
              onClick={() => bulkBaixaMut.mutate(Array.from(selectedIds))}
              disabled={bulkBaixaMut.isPending}
            >
              <CheckCircle2 className="size-4" /> Dar baixa
            </Button>
            <Popover open={bulkCategoryOpen} onOpenChange={setBulkCategoryOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="secondary" className="rounded-full gap-1.5 h-8">
                  <Filter className="size-4" /> Categoria
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-2">
                <div className="text-[10px] font-mono-kasa uppercase text-foreground/40 px-2 pb-2">
                  Aplicar categoria
                </div>
                <div className="max-h-64 overflow-auto space-y-0.5">
                  {(categories as any[]).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        bulkCategoryMut.mutate({
                          ids: Array.from(selectedIds),
                          categoryId: c.id,
                        })
                      }
                      className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
                    >
                      {c.nome || c.name}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button
              size="sm"
              variant="destructive"
              className="rounded-full gap-1.5 h-8"
              onClick={() => {
                if (confirm(`Cancelar ${selectedIds.size} lançamento(s)?`))
                  bulkCancelMut.mutate(Array.from(selectedIds));
              }}
              disabled={bulkCancelMut.isPending}
            >
              <Trash2 className="size-4" /> Cancelar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full h-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setSelectedIds(new Set())}
            >
              Limpar
            </Button>
          </div>
        </div>
      )}


      {/* Transactions Table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-10 py-4">
                <Checkbox
                  checked={
                    filteredTransactions.length > 0 &&
                    filteredTransactions.every((t: any) => selectedIds.has(t.id))
                  }
                  onCheckedChange={(c) => {
                    if (c) {
                      setSelectedIds(new Set(filteredTransactions.map((t: any) => t.id)));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                  aria-label="Selecionar todos"
                />
              </TableHead>
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
              <TableRowsSkeleton rows={6} columns={9} />
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
                const previsto = Number(t.valor_previsto) || Number(t.amount) || 0;
                const real = t.valor_real != null ? Number(t.valor_real) : null;
                const diff = real != null ? real - previsto : 0;
                const hasDiff = real != null && Math.abs(diff) > 0.005;
                const sign = t.type === "income" ? "+" : "-";
                const typeColor = t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
                const isNaoOp = t.nature === "nao_operacional";
                const todayStr = new Date().toISOString().slice(0, 10);
                const effectiveStatus =
                  t.status === "pending" && t.due_date && t.due_date < todayStr
                    ? "overdue"
                    : t.status;
                return (
                <TableRow
                  key={t.id}
                  className={cn(
                    "group transition-colors",
                    effectiveStatus === "paid"
                      ? "bg-emerald-500/10 hover:bg-emerald-500/15 border-l-2 border-l-emerald-600"
                      : effectiveStatus === "overdue"
                      ? "bg-red-500/10 hover:bg-red-500/15 border-l-2 border-l-red-600"
                      : isNaoOp
                      ? "bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-l-amber-500/60"
                      : "hover:bg-muted/10",
                  )}
                >
                  <TableCell className="py-4 w-10">
                    <Checkbox
                      checked={selectedIds.has(t.id)}
                      onCheckedChange={(c) => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (c) next.add(t.id);
                          else next.delete(t.id);
                          return next;
                        });
                      }}
                      aria-label="Selecionar"
                    />
                  </TableCell>
                  <TableCell className="py-4">
                    <InlineDuePicker transactionId={t.id} currentDate={t.due_date} />
                    {t.payment_date && <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono-kasa uppercase mt-1">Pago em {formatDateOnlyBR(t.payment_date)}</div>}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      {(t as any).number_display && (
                        <span className="text-[10px] font-mono-kasa font-bold text-muted-foreground bg-muted/40 border border-border/60 rounded px-1.5 py-0.5 shrink-0">
                          {(t as any).number_display}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingTx(t)}
                        className="font-semibold text-sm text-left hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer"
                        title="Editar lançamento"
                      >
                        {t.description}
                      </button>
                      {isNaoOp && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          Não-op
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {t.is_internal ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 w-fit">
                            <Home className="size-3" /> Despesa Kasa
                          </span>
                          <InlineSupplierPicker
                            transactionId={t.id}
                            currentSupplierId={t.supplier_id}
                            currentSupplierName={(t.suppliers as any)?.name || null}
                          />
                        </>
                      ) : (
                        (() => {
                          const catName = ((t.categorias_financeiras as any)?.nome || t.category || "")
                            .toString()
                            .toLowerCase()
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .trim();
                          const isProLabore = catName === "pro-labore" || catName === "pro labore";
                          if (isProLabore) {
                            return (
                              <span className="text-[10px] text-foreground/40 italic">
                                Direcionado aos sócios
                              </span>
                            );
                          }
                          const isFreelaCat =
                            catName.includes("freelancer") ||
                            catName.includes("freela") ||
                            catName.includes("terceiriz");
                          return (
                            <>
                              <InlineClientPicker
                                transactionId={t.id}
                                currentClientId={t.client_id}
                                currentClientName={
                                  (t.clients as any)?.company || (t.clients as any)?.name || null
                                }
                                currentClientPhotoUrl={(t.clients as any)?.logo_url || null}
                              />
                              {t.type === "expense" && (
                                (isFreelaCat || t.freelancer_id) ? (
                                  <InlineFreelancerPicker
                                    transactionId={t.id}
                                    currentFreelancerId={t.freelancer_id}
                                    currentFreelancerName={(t.freelancer as any)?.name || null}
                                    currentFreelancerPhotoUrl={(t.freelancer as any)?.photo_url || null}
                                  />
                                ) : (
                                  <InlineSupplierPicker
                                    transactionId={t.id}
                                    currentSupplierId={t.supplier_id}
                                    currentSupplierName={(t.suppliers as any)?.name || null}
                                  />
                                )
                              )}
                            </>
                          );
                        })()
                      )}
                    </div>
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
                    <StatusBadge status={effectiveStatus} dueDate={t.due_date} />
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center justify-end gap-1">
                      {(t.status === "pending" || t.status === "overdue") && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setBaixaTx(t)}
                                className="h-8 w-8 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                              >
                                <CreditCard className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Dar Baixa</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {t.type === "income" && t.client_id && (t.status === "pending" || t.status === "overdue") && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setBoletoTx(t)}
                                className="h-8 w-8 rounded-lg text-orange-600 hover:text-orange-700 hover:bg-orange-500/10"
                              >
                                <Barcode className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Emitir boleto (Inter)</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {t.status === "paid" && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setReciboTx(t)}
                                className="h-8 w-8 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-500/10"
                              >
                                <Receipt className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Gerar recibo</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {t.status === "paid" && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => statusMut.mutate({ id: t.id, status: "pending" })}
                                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                              >
                                <Clock className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Estornar para Pendente</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingTx(t)}
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingTx(t)}
                              className="h-8 w-8 rounded-lg text-red-600 dark:text-red-400 hover:text-red-600 hover:bg-red-500/10"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <div className="border-t border-border bg-muted/30 px-4 py-3 grid grid-cols-2 md:grid-cols-5 gap-4">
          <TotalCell label="Receitas" value={totals.receitas} className="text-emerald-600 dark:text-emerald-400" />
          <TotalCell label="Despesas" value={totals.despesas} className="text-red-600 dark:text-red-400" />
          <TotalCell label="Pró-labore" value={totals.proLabore} className="text-purple-600 dark:text-purple-400" />
          <TotalCell label="Não-operacional" value={totals.naoOperacional} className="text-amber-600 dark:text-amber-400" />
          <TotalCell
            label="Saldo do Período"
            value={saldoPeriodo}
            className={saldoPeriodo >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
          />
        </div>
      </div>

      <FinancialImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <TransactionFormDialog open={transactionOpen} onOpenChange={setTransactionOpen} />
      <TransactionFormDialog
        open={!!editingTx}
        onOpenChange={(o: boolean) => !o && setEditingTx(null)}
        transaction={editingTx}
      />
      <CategoriesManagerDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} />
      <ContasBancariasManagerDialog open={contasOpen} onOpenChange={setContasOpen} />
      <SuppliersManagerDialog open={suppliersOpen} onOpenChange={setSuppliersOpen} />
      <BaixaDialog
        open={!!baixaTx}
        onOpenChange={(o) => !o && setBaixaTx(null)}
        transaction={baixaTx}
      />
      <DeleteTransactionDialog
        open={!!deletingTx}
        onOpenChange={(o) => !o && setDeletingTx(null)}
        transaction={deletingTx}
      />
      <EmitirBoletoDialog
        open={!!boletoTx}
        onOpenChange={(o) => !o && setBoletoTx(null)}
        transaction={boletoTx}
      />
      <ReciboDialog
        open={!!reciboTx}
        onOpenChange={(o) => !o && setReciboTx(null)}
        transaction={reciboTx}
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

function StatCard({ title, value, icon: Icon, color, bg, cardBg }: { title: string, value?: number, icon: any, color: string, bg?: string, cardBg?: string }) {
  return (
    <Card className={cn("shadow-sm overflow-hidden group hover:border-primary/50 transition-colors", cardBg || "bg-surface border-border")}>
      <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
        <div className="flex items-center justify-between">
          <div className={cn("size-8 rounded-xl flex items-center justify-center", bg || "bg-muted")}>
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

function StatusBadge({ status, dueDate }: { status: string; dueDate?: string | null }) {
  let label = "";
  let cls = "";
  if (status === "paid") {
    label = "Pago";
    cls = "border-emerald-600 text-white bg-emerald-600";
  } else if (status === "cancelled") {
    label = "Cancelado";
    cls = "border-foreground/10 text-foreground/40 bg-foreground/5";
  } else if (status === "overdue") {
    let days = 0;
    if (dueDate) {
      const d = new Date(`${dueDate.slice(0, 10)}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      days = Math.max(0, Math.floor((today.getTime() - d.getTime()) / 86400000));
    }
    label = days > 0 ? `Atrasado · ${days}d` : "Atrasado";
    cls =
      days >= 30
        ? "border-red-800 text-white bg-red-800 animate-pulse"
        : days >= 7
        ? "border-red-600 text-white bg-red-600"
        : "border-orange-500 text-white bg-orange-500";
  } else {
    label = "Pendente";
    cls = "border-blue-500/20 text-blue-600 dark:text-blue-400 bg-blue-500/5";
  }
  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border-2", cls)}>
      {label}
    </Badge>
  );
}
