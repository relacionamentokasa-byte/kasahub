
import { useState, useMemo, useRef, useEffect } from "react";
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
import { effectiveAmount } from "@/lib/finance-values";
import { cn } from "@/lib/utils";
import { FinancialImportDialog } from "@/components/finance/FinancialImportDialog";
import { TransactionFormDialog } from "@/components/finance/TransactionFormDialog";
import { CategoriesManagerDialog } from "@/components/finance/CategoriesManagerDialog";
import { ContasBancariasManagerDialog } from "@/components/finance/ContasBancariasManagerDialog";
import { SuppliersManagerDialog } from "@/components/finance/SuppliersManagerDialog";

import { BaixaDialog } from "@/components/finance/BaixaDialog";
import { DeleteTransactionDialog } from "@/components/finance/DeleteTransactionDialog";
import { EmitirBoletoDialog } from "@/components/finance/EmitirBoletoDialog";
import { useServerFn } from "@tanstack/react-start";
import { getBoletoSignedUrl } from "@/lib/inter/boletos.functions";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileBadge,
  BadgeCheck,
  CheckCircle,
  Ban,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  ShieldAlert,
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
const isProLabore = (name: string | null | undefined) => {
  const n = normalize(name);
  return (
    n.includes(PRO_LABORE) ||
    n.includes("pro-labore") ||
    n.includes("prolabore") ||
    n.includes("retirada") ||
    n.includes("socio") ||
    n.includes("distribuicao")
  );
};
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
  const getSignedUrlFn = useServerFn(getBoletoSignedUrl);
  const openBoletoPdf = async (boletoId: string) => {
    try {
      const r = await getSignedUrlFn({ data: { boletoId } });
      if (r?.url) window.open(r.url, "_blank");
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível abrir o boleto.");
    }
  };
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
              let amount = parseAmountBR(getCol("valor", "amount", "valor previsto"));
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

          const { error } = await supabase.from("transactions").insert(payload.map(p => ({ ...p, valor_previsto: p.amount })));
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
  
  const [viewTab, setViewTab] = useState<"extrato" | "receber" | "pagar" | "prolabore" | "suspensos">("extrato");
  const [expenseSubFilter, setExpenseSubFilter] = useState<"all" | "suppliers" | "freelancers" | "fixed">("all");
  const [filter, setFilter] = useState({
    clientId: "all",
    status: "all",
    type: "all",
    categoryId: "all",
    search: "",
    nfStatus: "all",
    boletoStatus: "all",
  });
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [quickFilter, setQuickFilter] = useState<"all" | "income" | "expense_op" | "pro_labore">("all");
  const [quickChip, setQuickChip] = useState<"none" | "today" | "week" | "overdue" | "paid_month" | "missing_links">("none");
  const [showCancelled, setShowCancelled] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [filter, quickFilter, quickChip, showCancelled, viewTab, expenseSubFilter]);

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

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ["transactions", { ...filter, ...periodFilters, quickFilter, quickChip, showCancelled, page, viewTab, expenseSubFilter }],
    queryFn: () => fetchTransactions({
      ...filter,
      ...periodFilters,
      quickFilter,
      quickChip,
      showCancelled,
      page,
      pageSize,
      viewTab,
      expenseSubFilter,
    })
  });

  const transactions = transactionsData?.data || [];

  const totalCount = transactionsData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const { data: boletosAtivos = [] } = useQuery({
    queryKey: ["boletos_inter", "ativos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("boletos_inter")
        .select("id, transaction_id, situacao, pdf_path, emitido_em")
        .not("situacao", "in", "(CANCELADO,EXPIRADO)");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
  const boletoByTx = useMemo(() => {
    const m = new Map<string, any>();
    for (const b of boletosAtivos as any[]) if (b.transaction_id) m.set(b.transaction_id, b);
    return m;
  }, [boletosAtivos]);

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

  // Notação: Precisamos de indicadores do período completo para "totals" e blocos de resumo.
  // Já temos o hook fetchFinanceStats, mas alguns blocos locais ainda usam "transactions" (paginada).
  // Para manter a correção, os totais devem vir de fetchFinanceStats ou de uma query completa.
  // Como as regras de despesasReaisOperacionais/investimentoRealizado são customizadas, 
  // vamos usar os indicadores que já temos calculados em fetchFinanceStats se possível.

  const proLaboreMes = stats?.proLaboreMes || 0;
  const despesasReaisOperacionais = stats?.despesasReaisOperacionais || 0;
  const investimentoRealizado = stats?.investimentoRealizado || 0;

  // Adaptar o objeto 'totals' para usar os valores vindos de 'stats'
  const totals = {
    receitas: stats?.recebidasReceitas || 0,
    despesas: stats?.pagasDespesas || 0,
    proLabore: stats?.proLaboreMes || 0,
    naoOperacional: (stats?.naoOperacionalReceitas || 0) + (stats?.naoOperacionalDespesas || 0)
  };
  
  const cancelledCount = stats?.cancelledCount || 0;
  const saldoPeriodo = totals.receitas - totals.despesas - totals.proLabore;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 w-full mx-auto animate-reveal">

      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div>
          <span className="text-primary text-[10px] font-mono-kasa uppercase font-bold tracking-wider">Gestão · Financeiro</span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight mt-0.5">Fluxo de Caixa</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Controle de receitas, despesas e previsibilidade de caixa.</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full lg:w-auto">
          {/* Barra de Mês e Mais Ações (Largura total no mobile com centralização perfeita) */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none flex items-center justify-between sm:justify-center bg-muted/50 border border-border/70 rounded-xl p-1 h-10 sm:h-9">
              <Button
                variant="ghost"
                size="icon"
                onClick={prevMonth}
                className="size-8 sm:size-7 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-all shrink-0"
              >
                <ChevronLeft className="size-4" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex-1 sm:flex-none text-center px-3 py-1 text-xs font-mono-kasa font-bold uppercase tracking-wider hover:text-primary transition-colors cursor-pointer truncate"
                  >
                    {currentMonthLabel}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="center">
                  <div className="flex gap-2">
                    <Select
                      value={String(selectedDate.getMonth())}
                      onValueChange={(v) => {
                        const d = new Date(selectedDate);
                        d.setMonth(Number(v));
                        setSelectedDate(d);
                      }}
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"].map((m, i) => (
                          <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(selectedDate.getFullYear())}
                      onValueChange={(v) => {
                        const d = new Date(selectedDate);
                        d.setFullYear(Number(v));
                        setSelectedDate(d);
                      }}
                    >
                      <SelectTrigger className="w-[90px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="icon"
                onClick={nextMonth}
                className="size-8 sm:size-7 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-all shrink-0"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            {/* Menu Dropdown de Gestão no Mobile */}
            <div className="lg:hidden shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl border-border/80 bg-muted/30">
                    <MoreVertical className="size-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 font-mono-kasa text-xs p-1.5">
                  <DropdownMenuItem onClick={() => setCategoriesOpen(true)} className="py-2">
                    <Settings className="size-3.5 mr-2 text-muted-foreground" /> Categorias
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setContasOpen(true)} className="py-2">
                    <Landmark className="size-3.5 mr-2 text-muted-foreground" /> Contas Bancárias
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSuppliersOpen(true)} className="py-2">
                    <Users className="size-3.5 mr-2 text-muted-foreground" /> Fornecedores
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="py-2">
                    <Upload className="size-3.5 mr-2 text-muted-foreground" /> Importar Planilha
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadTemplate} className="py-2">
                    <Download className="size-3.5 mr-2 text-muted-foreground" /> Baixar Modelo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Ações Desktop */}
          <div className="hidden lg:flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl h-9 gap-1.5 text-xs font-mono-kasa border-border/80" onClick={() => setCategoriesOpen(true)}>
              <Settings className="size-3.5" /> Categorias
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl h-9 gap-1.5 text-xs font-mono-kasa border-border/80" onClick={() => setContasOpen(true)}>
              <Landmark className="size-3.5" /> Contas
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl h-9 gap-1.5 text-xs font-mono-kasa border-border/80" onClick={() => setSuppliersOpen(true)}>
              <Settings className="size-3.5" /> Fornecedores
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl h-9 gap-1.5 text-xs font-mono-kasa border-border/80">
                  <FileSpreadsheet className="size-3.5" /> Importar
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
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={handleFileUpload}
          />

          <Button
            size="sm"
            className="rounded-xl h-10 sm:h-9 w-full sm:w-auto gap-2 text-xs font-mono-kasa bg-primary text-primary-foreground shadow-sm font-bold justify-center"
            onClick={() => setTransactionOpen(true)}
          >
            <Plus className="size-4 stroke-[2.5]" /> Novo Lançamento
          </Button>
        </div>
      </header>

      {/* KPI Cards - Grid 2x2 no mobile e 5 colunas no desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        <StatCard title="Receitas Recebidas" value={stats?.recebidasReceitas} icon={TrendingUp} subtitle="Liquidadas no mês" />
        <StatCard title="Receitas Previstas" value={stats?.previstasReceitas} icon={Clock} subtitle="Vencimentos a receber" />
        <StatCard title="Despesas Pagas" value={stats?.pagasDespesas} icon={TrendingDown} subtitle="Operacionais pagas" />
        <StatCard title="Despesas Previstas" value={stats?.previstasDespesas} icon={AlertCircle} subtitle="Compromissos a pagar" />
        <div className="col-span-2 lg:col-span-1">
          <StatCard title="Pró-labore & Vales" value={proLaboreMes} icon={Wallet} subtitle="Visão societária" />
        </div>
      </div>

      {/* Abas Funcionais e Filtros Estruturados */}
      <div className="space-y-4">
        <Tabs
          value={viewTab}
          onValueChange={(v) => {
            setViewTab(v as any);
            setFilter(prev => ({ ...prev, type: "all" }));
          }}
          className="w-full"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
            <TabsList className="bg-muted/60 p-1 rounded-xl h-11 border border-border/60 flex-wrap">
              <TabsTrigger value="extrato" className="rounded-lg px-4 h-9 text-xs font-mono-kasa font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                <Wallet className="size-3.5" /> Extrato Geral
              </TabsTrigger>
              <TabsTrigger value="receber" className="rounded-lg px-4 h-9 text-xs font-mono-kasa font-medium gap-1.5 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300 data-[state=active]:shadow-xs">
                <ArrowDownLeft className="size-3.5 text-emerald-600 dark:text-emerald-400" /> A Receber
              </TabsTrigger>
              <TabsTrigger value="pagar" className="rounded-lg px-4 h-9 text-xs font-mono-kasa font-medium gap-1.5 data-[state=active]:bg-red-500/15 data-[state=active]:text-red-700 dark:data-[state=active]:text-red-300 data-[state=active]:shadow-xs">
                <ArrowUpRight className="size-3.5 text-red-600 dark:text-red-400" /> A Pagar
              </TabsTrigger>
              <TabsTrigger value="prolabore" className="rounded-lg px-4 h-9 text-xs font-mono-kasa font-medium gap-1.5 data-[state=active]:bg-indigo-500/15 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-300 data-[state=active]:shadow-xs">
                <Users className="size-3.5 text-indigo-600 dark:text-indigo-400" /> Pró-labore & Vales
              </TabsTrigger>
              <TabsTrigger value="suspensos" className="rounded-lg px-4 h-9 text-xs font-mono-kasa font-medium gap-1.5 data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300 data-[state=active]:shadow-xs">
                <ShieldAlert className="size-3.5 text-amber-600 dark:text-amber-400" /> Suspensos / Retidos
              </TabsTrigger>
            </TabsList>

            {cancelledCount > 0 && (
              <button
                type="button"
                onClick={() => setShowCancelled((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-2 text-xs px-3.5 h-9 rounded-xl border transition-colors font-mono-kasa",
                  showCancelled
                    ? "border-foreground/30 bg-foreground/5 text-foreground/80"
                    : "border-border/80 text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-card",
                )}
                title={showCancelled ? "Ocultar cancelados" : "Mostrar cancelados"}
              >
                <span className={cn("size-1.5 rounded-full", showCancelled ? "bg-foreground/60" : "bg-foreground/30")} />
                {showCancelled ? "Ocultar" : "Mostrar"} cancelados ({cancelledCount})
              </button>
            )}
          </div>
        </Tabs>

        {/* Sub-filtros dinâmicos contextualizados por Aba */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 flex flex-wrap gap-4 items-end shadow-xs">
          <div className="flex-1 min-w-[220px] space-y-1.5">
            <label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground px-1">Busca Textual</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Descrição, cliente ou fornecedor..."
                className="pl-9 h-10 rounded-xl bg-background border-border/80 text-xs"
                value={filter.search}
                onChange={e => setFilter({ ...filter, search: e.target.value })}
              />
            </div>
          </div>

          {/* Sub-filtros para aba A Pagar */}
          {viewTab === "pagar" && (
            <div className="w-full sm:w-48 space-y-1.5">
              <label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground px-1">Subdivisão</label>
              <Select value={expenseSubFilter} onValueChange={(v: any) => setExpenseSubFilter(v)}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-background border-border/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Despesas</SelectItem>
                  <SelectItem value="suppliers">Fornecedores</SelectItem>
                  <SelectItem value="freelancers">Freelancers</SelectItem>
                  <SelectItem value="fixed">Despesas Fixas / Kasa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filtros de Cliente para Extrato, A Receber e Suspensos */}
          {(viewTab === "extrato" || viewTab === "receber" || viewTab === "suspensos") && (
            <div className="w-full sm:w-48 space-y-1.5">
              <label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground px-1">Cliente</label>
              <Select value={filter.clientId} onValueChange={v => setFilter({ ...filter, clientId: v })}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-background border-border/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Clientes</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filtros de NF e Boleto dedicados para A Receber ou Extrato */}
          {(viewTab === "extrato" || viewTab === "receber") && (
            <>
              <div className="w-full sm:w-36 space-y-1.5">
                <label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground px-1">Nota Fiscal</label>
                <Select value={filter.nfStatus || "all"} onValueChange={v => setFilter({ ...filter, nfStatus: v })}>
                  <SelectTrigger className="h-10 rounded-xl text-xs bg-background border-border/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas NF</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="emitida">Emitida</SelectItem>
                    <SelectItem value="nao_necessaria">Não necessária</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-36 space-y-1.5">
                <label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground px-1">Boleto Interno</label>
                <Select value={filter.boletoStatus || "all"} onValueChange={v => setFilter({ ...filter, boletoStatus: v })}>
                  <SelectTrigger className="h-10 rounded-xl text-xs bg-background border-border/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Boletos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="emitido">Emitido</SelectItem>
                    <SelectItem value="nao_se_aplica">Não se aplica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="w-full sm:w-36 space-y-1.5">
            <label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground px-1">Status</label>
            <Select value={filter.status} onValueChange={v => setFilter({ ...filter, status: v })}>
              <SelectTrigger className="h-10 rounded-xl text-xs bg-background border-border/80">
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

          <div className="w-full sm:w-44 space-y-1.5">
            <label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground px-1">Categoria</label>
            <Select value={filter.categoryId} onValueChange={v => setFilter({ ...filter, categoryId: v })}>
              <SelectTrigger className="h-10 rounded-xl text-xs bg-background border-border/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome || c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Quick chips */}
      <div className="flex flex-wrap items-center gap-2">
        {(() => {
          const missingLinksCount = transactionsData?.data?.filter((t: any) => {
            if (t.status === "cancelled") return false;
            if (t.type === "income") return !t.client_id;
            if (t.type === "expense") return !t.client_id && !t.supplier_id && !t.freelancer_id && !t.partner_id;
            return false;
          }).length || 0;
          const chips = [
            { id: "none", label: "Tudo" },
            { id: "today", label: "Hoje" },
            { id: "week", label: "Próx. 7 dias" },
            { id: "overdue", label: "Atrasados" },
            { id: "paid_month", label: "Pagos do mês" },
            { id: "missing_links", label: `Sem vínculo${missingLinksCount ? ` (${missingLinksCount})` : ""}` },
          ];
          return chips.map((c) => {
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
                      : c.id === "missing_links"
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-primary text-primary-foreground border-primary"
                    : c.id === "missing_links" && missingLinksCount > 0
                    ? "border-amber-500/40 text-amber-600 hover:bg-amber-500/10 bg-amber-500/5"
                    : "border-border text-foreground/60 hover:text-foreground hover:border-foreground/30 bg-surface",
                )}
              >
                {c.label}
              </button>
            );
          });
        })()}
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


      {/* Painel da Regra de Ouro / Distribuição - Exclusivo na aba Pró-labore & Vales */}
      {viewTab === "prolabore" && (
        <FinancialRulesPanel
          totalFaturamento={stats?.recebidasReceitas ?? 0}
          faturamentoPrevisto={(stats?.previstasReceitas ?? 0) + (stats?.recebidasReceitas ?? 0)}
          despesasReais={despesasReaisOperacionais}
          investimentoRealizado={investimentoRealizado}
          periodoLabel={currentMonthLabel}
        />
      )}

      {/* Transactions: cards no mobile e tabela completa no desktop */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="md:hidden divide-y divide-border/60">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-3 opacity-50">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                <Wallet className="size-6 text-muted-foreground" />
              </div>
              <p className="text-xs font-mono-kasa">Nenhum lançamento em {currentMonthLabel}.</p>
            </div>
          ) : (
            transactions.map((t: any) => {
              const value = effectiveAmount(t);
              const sign = t.type === "income" ? "+" : "-";
              const typeColor = t.type === "income"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400";
              const todayStr = new Date().toISOString().slice(0, 10);
              const effectiveStatus =
                t.status === "pending" && t.due_date && t.due_date < todayStr
                  ? "overdue"
                  : t.status;
              const isNaoOp = t.nature === "nao_operacional";
              const partyName = t.is_internal
                ? "Despesa Kasa"
                : (t.clients as any)?.company
                  || (t.clients as any)?.name
                  || (t.suppliers as any)?.name
                  || (t.freelancer as any)?.name;
              const categoryName = (t.categorias_financeiras as any)?.nome || t.category || "Sem categoria";
              const boleto = boletoByTx.get(t.id);

              return (
                <div
                  key={t.id}
                  className={cn(
                    "p-4 border-l-4 transition-colors",
                    effectiveStatus === "paid"
                      ? "bg-emerald-500/[0.04] border-l-emerald-500"
                      : effectiveStatus === "overdue"
                        ? "bg-rose-500/[0.04] border-l-rose-500"
                        : isNaoOp
                          ? "bg-amber-500/[0.04] border-l-amber-500"
                          : "bg-card border-l-border/80",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(t.id)}
                      onCheckedChange={(checked) => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(t.id);
                          else next.delete(t.id);
                          return next;
                        });
                      }}
                      aria-label="Selecionar lançamento"
                      className="mt-1 shrink-0"
                    />

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(t as any).number_display && (
                          <span className="text-[9px] font-mono-kasa text-muted-foreground bg-muted/40 border border-border/60 rounded px-1.5 py-0.5">
                            {String((t as any).number_display).startsWith("#") ? t.number_display : `#${t.number_display}`}
                          </span>
                        )}
                        <StatusBadge status={effectiveStatus} dueDate={t.due_date} />
                        {isNaoOp && (
                          <span className="text-[9px] font-mono-kasa uppercase px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground border border-border/60">
                            Não-op
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingTx(t)}
                        className="block w-full text-left font-semibold text-xs leading-snug text-foreground hover:text-primary line-clamp-2"
                        title="Editar lançamento"
                      >
                        {t.description}
                      </button>

                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono-kasa text-muted-foreground">
                        <span className="truncate max-w-[150px] text-foreground/75">{partyName || "Sem vínculo"}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDateOnlyBR(t.due_date) || "Sem vencimento"}</span>
                        <span className="rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 truncate max-w-[130px]">
                          {categoryName}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={cn("font-mono-kasa tabular-nums font-bold text-sm tracking-tight", typeColor)}>
                        {sign} {brl(value)}
                      </span>
                      {boleto && (
                        <button
                          type="button"
                          onClick={() => openBoletoPdf(boleto.id)}
                          className="inline-flex items-center gap-1 text-[9px] font-mono-kasa text-muted-foreground hover:text-foreground"
                          title={`Boleto Inter · ${boleto.situacao}`}
                        >
                          <Barcode className="size-3" /> Boleto
                        </button>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        {(t.status === "pending" || t.status === "overdue") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBaixaTx(t)}
                            className="h-7 px-2 text-[10px] font-mono-kasa font-semibold gap-1 text-emerald-600 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20"
                          >
                            <CreditCard className="size-3" /> Baixar
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" aria-label="Ações do lançamento">
                              <MoreVertical className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 font-mono-kasa text-xs">
                            <DropdownMenuItem onClick={() => setEditingTx(t)}>
                              <Pencil className="size-3.5 mr-2" /> Editar
                            </DropdownMenuItem>
                            {t.type === "income" && t.client_id && (t.status === "pending" || t.status === "overdue") && !boleto && (
                              <DropdownMenuItem onClick={() => setBoletoTx(t)}>
                                <Barcode className="size-3.5 mr-2" /> Emitir boleto
                              </DropdownMenuItem>
                            )}
                            {t.status === "paid" && (
                              <DropdownMenuItem onClick={() => setReciboTx(t)}>
                                <Receipt className="size-3.5 mr-2" /> Gerar recibo
                              </DropdownMenuItem>
                            )}
                            {t.status === "paid" && (
                              <DropdownMenuItem onClick={() => statusMut.mutate({ id: t.id, status: "pending" })}>
                                <Clock className="size-3.5 mr-2" /> Estornar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setDeletingTx(t)} className="text-destructive focus:text-destructive">
                              <Trash2 className="size-3.5 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Table className="hidden md:table">
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-10 py-4">
                <Checkbox
                  checked={
                    transactions.length > 0 &&
                    transactions.length > 0 && transactions.every((t: any) => selectedIds.has(t.id))
                  }

                  onCheckedChange={(c) => {
                    if (c) {
                      setSelectedIds(new Set(transactions.map((t: any) => t.id)));
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
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-4 text-right">Valor</TableHead>
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-4 text-center">Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRowsSkeleton rows={6} columns={8} />
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-64 text-center">

                  <div className="flex flex-col items-center justify-center space-y-3 opacity-40">
                    <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                      <Wallet className="size-8" />
                    </div>
                    <p className="font-display font-medium">Nenhum lançamento financeiro encontrado para {currentMonthLabel}.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t: any) => {
                // Coluna única de valor: regra do valor efetivamente movimentado
                const previsto = Number(t.valor_previsto) > 0 ? Number(t.valor_previsto) : Number(t.amount) || 0;
                const real = t.valor_real != null ? Number(t.valor_real) : null;
                const valorExibido = effectiveAmount(t);
                const diff = real != null && real > 0 ? real - previsto : 0;
                const hasDiff = real != null && real > 0 && Math.abs(diff) > 0.005;
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
                    "group transition-colors border-l-[3px]",
                    effectiveStatus === "paid"
                      ? "bg-emerald-500/[0.08] hover:bg-emerald-500/[0.14] border-l-emerald-500 text-foreground"
                      : effectiveStatus === "overdue"
                      ? "bg-rose-500/[0.08] hover:bg-rose-500/[0.14] border-l-rose-500 text-foreground"
                      : isNaoOp
                      ? "bg-amber-500/[0.06] hover:bg-amber-500/[0.12] border-l-amber-500 text-foreground"
                      : "bg-card hover:bg-muted/30 border-l-border/80",
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
                    {t.payment_date && effectiveStatus !== "paid" && (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono-kasa uppercase mt-1">
                        Pago em {formatDateOnlyBR(t.payment_date)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      {(t as any).number_display && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono-kasa text-muted-foreground bg-muted/30 border border-border/60 rounded px-1.5 py-0.5 shrink-0">
                          {String((t as any).number_display).startsWith("#")
                            ? (t as any).number_display
                            : `#${(t as any).number_display}`}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingTx(t)}
                        className="font-semibold text-xs text-left text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer"
                        title="Editar lançamento"
                      >
                        {(() => {
                          const dme = (t as any).extra_demands;
                          const batch = (t as any).dme_batches;
                          const batchData = Array.isArray(batch) ? batch[0] : batch;

                          if (dme) {
                            return `${dme.number_display} - ${dme.title}`;
                          }

                          if (batchData?.friendly_number) {
                            const count = batchData.items_count?.[0]?.count || 0;
                            const formattedFriendly = String(batchData.friendly_number).padStart(4, '0');
                            return `Cobrança consolidada — ${count} DMEs (Lote ${formattedFriendly})`;
                          }

                          return t.description;
                        })()}
                      </button>
                      {isNaoOp && (
                        <span className="text-[9px] font-mono-kasa uppercase px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground border border-border/60">
                          Não-op
                        </span>
                      )}
                      {boletoByTx.get(t.id) && (() => {
                        const b = boletoByTx.get(t.id);
                        const isPaid = b.situacao === "RECEBIDO";
                        return (
                          <button
                            type="button"
                            onClick={() => openBoletoPdf(b.id)}
                            title={`Boleto Inter · ${b.situacao}`}
                            className={cn(
                              "inline-flex items-center gap-1 text-[9px] font-mono-kasa uppercase px-1.5 py-0.5 rounded border transition-colors cursor-pointer",
                              isPaid
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                : "bg-muted/30 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/60"
                            )}
                          >
                            <Barcode className="size-3" />
                            {isPaid ? "Boleto pago" : "Boleto emitido"}
                          </button>
                        );
                      })()}

                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {t.is_internal ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono-kasa px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground border border-border/60 shrink-0">
                            <Home className="size-2.5" /> Despesa Kasa
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
                            return null;
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
                  <TableCell className={cn("py-4 text-right font-mono-kasa font-semibold text-xs tabular-nums tracking-tight", typeColor)}>
                    <div className="flex flex-col items-end gap-1">
                      <span>{sign} {brl(valorExibido)}</span>
                      {hasDiff && t.clients?.financial_collection_status !== 'suspended' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono-kasa font-semibold",
                                  diff > 0
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                )}
                              >
                                {diff > 0 ? "+" : ""}
                                {brl(diff)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                <div className="font-semibold">{t.motivo_diferenca || "Diferença no valor"}</div>
                                {t.observacao_diferenca && <div className="text-muted-foreground mt-1 max-w-[240px]">{t.observacao_diferenca}</div>}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {t.clients?.financial_collection_status === 'suspended' && t.status !== 'paid' && (
                        <span className="text-[9px] font-bold text-amber-500 uppercase">Cobrança Suspensa</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <StatusBadge status={effectiveStatus} dueDate={t.due_date} />
                      <div className="flex items-center gap-1.5">
                        <InternalControls 
                          transactionId={t.id}
                          nfStatus={t.nf_status || "pendente"}
                          boletoStatus={t.boleto_internal_status || "nao_se_aplica"}
                        />
                      </div>
                    </div>
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
                      {t.type === "income" && t.client_id && (t.status === "pending" || t.status === "overdue") && !boletoByTx.get(t.id) && (
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
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-surface border-t border-border">
            <div className="text-xs text-foreground/40 font-mono-kasa uppercase">
              Página {page} de {totalPages} · {totalCount} registros
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full h-8 text-xs font-bold uppercase tracking-widest gap-1"
                disabled={page <= 1}
                onClick={() => {
                  setPage(prev => Math.max(1, prev - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <ChevronLeft className="size-3.5" /> Anterior
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pNum = i + 1;
                  if (totalPages > 5 && page > 3) {
                    pNum = page - 2 + i;
                    if (pNum + (4 - i) > totalPages) pNum = totalPages - 4 + i;
                  }
                  if (pNum <= 0) return null;
                  if (pNum > totalPages) return null;

                  return (
                    <Button
                      key={pNum}
                      variant={page === pNum ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "size-8 rounded-full p-0 text-xs font-bold transition-all",
                        page === pNum ? "bg-primary text-primary-foreground" : "hover:bg-primary/10 hover:text-primary"
                      )}
                      onClick={() => {
                        setPage(pNum);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      {pNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full h-8 text-xs font-bold uppercase tracking-widest gap-1"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage(prev => Math.min(totalPages, prev + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Próximo <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
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

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value?: number;
  icon: any;
  subtitle?: string;
}) {
  return (
    <div className="group rounded-xl border border-border/80 bg-card p-4 flex flex-col justify-between hover:border-foreground/25 hover:shadow-xs transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold truncate">
            {title}
          </span>
        </div>
      </div>
      <div className="mt-3">
        <div className="font-display text-xl lg:text-2xl font-bold tracking-tight text-foreground tabular-nums font-mono-kasa">
          {brl(value || 0)}
        </div>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground/75 mt-0.5 truncate font-mono-kasa">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, dueDate }: { status: string; dueDate?: string | null }) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono-kasa tabular-nums px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
        Pago
      </span>
    );
  }

  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono-kasa tabular-nums px-2 py-0.5 rounded border border-border/40 bg-muted/10 text-muted-foreground/60">
        Cancelado
      </span>
    );
  }

  if (status === "overdue") {
    let days = 0;
    if (dueDate) {
      const d = new Date(`${dueDate.slice(0, 10)}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      days = Math.max(0, Math.floor((today.getTime() - d.getTime()) / 86400000));
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono-kasa tabular-nums px-2 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-500 font-semibold">
        {days > 0 ? `Atrasado ${days}d` : "Atrasado"}
      </span>
    );
  }

  let isToday = false;
  if (dueDate) {
    const todayStr = new Date().toISOString().slice(0, 10);
    isToday = dueDate.slice(0, 10) === todayStr;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-mono-kasa tabular-nums px-2 py-0.5 rounded border font-medium",
        isToday
          ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          : "border-border/60 bg-muted/20 text-muted-foreground"
      )}
    >
      {isToday ? "Vence hoje" : "Pendente"}
    </span>
  );
}

function InternalControls({ 
  transactionId, 
  nfStatus, 
  boletoStatus 
}: { 
  transactionId: string; 
  nfStatus: string; 
  boletoStatus: string;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (patch: any) => updateTransaction(transactionId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-stats"] });
    },
  });

  const nfConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    pendente: { label: "NF Pendente", icon: Clock, color: "text-orange-600", bg: "bg-orange-500/10" },
    emitida: { label: "NF Emitida", icon: BadgeCheck, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    nao_necessaria: { label: "NF Não Necessária", icon: Ban, color: "text-muted-foreground", bg: "bg-muted" },
  };

  const boletoConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    pendente: { label: "Boleto Pendente", icon: Clock, color: "text-orange-600", bg: "bg-orange-500/10" },
    emitido: { label: "Boleto Emitido", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    nao_se_aplica: { label: "Boleto Não se Aplica", icon: Ban, color: "text-muted-foreground", bg: "bg-muted" },
  };

  const nf = nfConfig[nfStatus] || nfConfig.pendente;
  const bol = boletoConfig[boletoStatus] || boletoConfig.nao_se_aplica;

  return (
    <div className="flex items-center gap-1.5">
      <TooltipProvider>
        <DropdownMenu>
          <Tooltip>
            <DropdownMenuTrigger asChild>
              <TooltipTrigger asChild>
                <button className={cn("size-6 rounded-md flex items-center justify-center transition-colors hover:opacity-80", nf.bg, nf.color)}>
                  <nf.icon className="size-3.5" />
                </button>
              </TooltipTrigger>
            </DropdownMenuTrigger>
            <TooltipContent>{nf.label}</TooltipContent>
            <DropdownMenuContent align="center">
              <DropdownMenuItem onClick={() => mutation.mutate({ nf_status: "pendente" })}>
                <Clock className="size-4 mr-2 text-orange-600" /> Pendente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => mutation.mutate({ nf_status: "emitida" })}>
                <BadgeCheck className="size-4 mr-2 text-emerald-600" /> Emitida
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => mutation.mutate({ nf_status: "nao_necessaria" })}>
                <Ban className="size-4 mr-2 text-muted-foreground" /> Não necessária
              </DropdownMenuItem>
            </DropdownMenuContent>
          </Tooltip>
        </DropdownMenu>

        <DropdownMenu>
          <Tooltip>
            <DropdownMenuTrigger asChild>
              <TooltipTrigger asChild>
                <button className={cn("size-6 rounded-md flex items-center justify-center transition-colors hover:opacity-80", bol.bg, bol.color)}>
                  <bol.icon className="size-3.5" />
                </button>
              </TooltipTrigger>
            </DropdownMenuTrigger>
            <TooltipContent>{bol.label}</TooltipContent>
            <DropdownMenuContent align="center">
              <DropdownMenuItem onClick={() => mutation.mutate({ boleto_internal_status: "pendente" })}>
                <Clock className="size-4 mr-2 text-orange-600" /> Pendente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => mutation.mutate({ boleto_internal_status: "emitido" })}>
                <CheckCircle className="size-4 mr-2 text-emerald-600" /> Emitido
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => mutation.mutate({ boleto_internal_status: "nao_se_aplica" })}>
                <Ban className="size-4 mr-2 text-muted-foreground" /> Não se aplica
              </DropdownMenuItem>
            </DropdownMenuContent>
          </Tooltip>
        </DropdownMenu>
      </TooltipProvider>
    </div>
  );
}
