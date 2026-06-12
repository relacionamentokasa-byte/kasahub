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
  ChevronRight
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
import { toast } from "sonner";

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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    console.log(file);
    toast.info("Arquivo selecionado. Integração de leitura em breve.", {
      description: file.name,
    });
    event.target.value = "";
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
      qc.invalidateQueries({ queryKey: ["finance-stats"] });
      toast.success("Status atualizado");
    }
  });

  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(filter.search.toLowerCase()) ||
    (t.clients as any)?.company?.toLowerCase().includes(filter.search.toLowerCase()) ||
    (t.clients as any)?.name?.toLowerCase().includes(filter.search.toLowerCase())
  );

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
        <StatCard title="Receitas Previstas" value={stats?.previstasReceitas} icon={Clock} color="text-blue-500" />
        <StatCard title="Receitas Recebidas" value={stats?.recebidasReceitas} icon={TrendingUp} color="text-emerald-500" />
        <StatCard title="Parcelas Futuras" value={stats?.parcelasFuturas} icon={Calendar} color="text-primary" />
        <StatCard title="Despesas Previstas" value={stats?.previstasDespesas} icon={AlertCircle} color="text-amber-500" />
        <StatCard title="Despesas Pagas" value={stats?.pagasDespesas} icon={TrendingDown} color="text-red-500" />
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
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-4 text-right">Valor</TableHead>
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-4 text-center">Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-foreground/30 italic">Carregando...</TableCell></TableRow>
            ) : filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3 opacity-40">
                    <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                      <Wallet className="size-8" />
                    </div>
                    <p className="font-display font-medium">Nenhum lançamento financeiro encontrado para {currentMonthLabel}.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((t) => (
                <TableRow key={t.id} className="group hover:bg-muted/10 transition-colors">
                  <TableCell className="py-4">
                    <div className="text-sm font-medium">{new Date(t.due_date).toLocaleDateString("pt-BR")}</div>
                    {t.payment_date && <div className="text-[10px] text-emerald-500 font-mono-kasa uppercase">Pago em {new Date(t.payment_date).toLocaleDateString("pt-BR")}</div>}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="font-semibold text-sm">{t.description}</div>
                    <Link 
                      to="/clientes/$clientId"
                      params={{ clientId: t.client_id || "" }}
                      data-testid="client-link"
                      className="group/client flex items-center gap-1.5 mt-0.5"
                    >
                      <span className="text-[10px] text-foreground/40 font-bold uppercase truncate max-w-[200px] group-hover/client:text-primary group-hover/client:underline cursor-pointer transition-all">
                        {(t.clients as any)?.company || (t.clients as any)?.name || "—"}
                      </span>
                      <ArrowRight className="size-2 text-foreground/20 group-hover/client:text-primary group-hover/client:translate-x-0.5 transition-all" />
                    </Link>

                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="outline" className="rounded-full text-[10px] font-mono-kasa uppercase tracking-tight">
                      {t.category || (t.transaction_categories as any)?.name || "Geral"}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn("py-4 text-right font-bold text-sm", t.type === "income" ? "text-emerald-500" : "text-red-500")}>
                    {t.type === "income" ? "+" : "-"} {brl(Number(t.amount))}
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
                          <DropdownMenuItem onClick={() => statusMut.mutate({ id: t.id, status: "paid" })} className="text-emerald-500 gap-2">
                            <CheckCircle2 className="size-4" /> Marcar como Pago
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <FinancialImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <TransactionFormDialog open={transactionOpen} onOpenChange={setTransactionOpen} />
      <CategoriesManagerDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} />
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
          <Badge variant="outline" className="text-[10px] font-mono-kasa text-foreground/30">Mês Atual</Badge>
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
