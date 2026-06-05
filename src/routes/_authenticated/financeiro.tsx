import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  Repeat,
  CircleDollarSign,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Trash2,
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
} from "recharts";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  accountBalance,
  brl,
  cashflowByMonth,
  computeIndicators,
  deleteBankAccount,
  deleteContract,
  deleteTransaction,
  fetchBankAccounts,
  fetchContracts,
  fetchTransactions,
  markPaid,
} from "@/lib/finance-api";
import { fetchClients } from "@/lib/ops-api";
import { NewTransactionDialog } from "@/components/finance/NewTransactionDialog";
import { NewBankAccountDialog } from "@/components/finance/NewBankAccountDialog";
import { NewContractDialog } from "@/components/finance/NewContractDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — KASA OS" }] }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const qc = useQueryClient();
  const { data: txs = [] } = useQuery({ queryKey: ["transactions"], queryFn: () => fetchTransactions() });
  const { data: accounts = [] } = useQuery({ queryKey: ["bank_accounts"], queryFn: fetchBankAccounts });
  const { data: contracts = [] } = useQuery({ queryKey: ["contracts"], queryFn: () => fetchContracts() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });

  const indicators = useMemo(() => computeIndicators(txs, contracts), [txs, contracts]);
  const chartData = useMemo(() => cashflowByMonth(txs, 6), [txs]);
  const clientName = (id: string | null | undefined) => {
    if (!id) return "—";
    const c = clients.find((c) => c.id === id);
    return c ? (c.company || c.name) : "—";
  };

  const [openTx, setOpenTx] = useState<false | "income" | "expense">(false);
  const [openAcc, setOpenAcc] = useState(false);
  const [openContract, setOpenContract] = useState(false);

  const consolidated = accounts.reduce((s, a) => s + accountBalance(a, txs), 0);

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
  const delContract = useMutation({
    mutationFn: (id: string) => deleteContract(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts"] }),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 lg:px-10 pt-6 pb-4 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <span className="text-primary text-[10px] font-mono uppercase tracking-[0.25em]">
            Gestão · Financeiro
          </span>
          <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight mt-1">
            Financeiro 360°
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setOpenTx("expense")}
            variant="outline"
            className="border-border rounded-full h-10 px-4 gap-2"
          >
            <TrendingDown className="size-4 text-rose-400" /> Despesa
          </Button>
          <Button
            onClick={() => setOpenTx("income")}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold h-10 px-5 gap-2"
          >
            <Plus className="size-4" /> Receita
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 lg:px-10 pb-10">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-surface border border-border">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="receivables">A receber</TabsTrigger>
            <TabsTrigger value="payables">A pagar</TabsTrigger>
            <TabsTrigger value="contracts">Contratos</TabsTrigger>
            <TabsTrigger value="accounts">Contas</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* KPI grid - Bento */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Kpi
                label="Saldo consolidado"
                value={brl(consolidated)}
                icon={<Wallet className="size-4" />}
                tone="primary"
              />
              <Kpi
                label="Receita do mês"
                value={brl(indicators.monthIncome)}
                icon={<TrendingUp className="size-4" />}
                tone="success"
              />
              <Kpi
                label="Despesa do mês"
                value={brl(indicators.monthExpense)}
                icon={<TrendingDown className="size-4" />}
                tone="danger"
              />
              <Kpi
                label="Resultado do mês"
                value={brl(indicators.monthResult)}
                icon={<CircleDollarSign className="size-4" />}
                tone={indicators.monthResult >= 0 ? "success" : "danger"}
              />
              <Kpi label="MRR" value={brl(indicators.mrr)} icon={<Repeat className="size-4" />} tone="primary" />
              <Kpi label="ARR" value={brl(indicators.arr)} icon={<Repeat className="size-4" />} />
              <Kpi label="Ticket recorrente" value={brl(indicators.ticketRecurrente)} />
              <Kpi label="Ticket geral" value={brl(indicators.ticketGeral)} />
            </div>

            {indicators.overdueCount > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10">
                <AlertTriangle className="size-5 text-rose-400" />
                <div className="text-sm">
                  <span className="font-semibold text-rose-300">{indicators.overdueCount}</span>{" "}
                  lançamento(s) em atraso totalizando{" "}
                  <span className="font-semibold text-rose-300">{brl(indicators.overdueAmount)}</span>.
                </div>
              </div>
            )}

            {/* Cashflow chart */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-lg font-semibold">Fluxo de caixa</h2>
                  <p className="text-xs text-foreground/50">Últimos 6 meses</p>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="label" stroke="hsl(var(--foreground))" opacity={0.6} fontSize={12} />
                    <YAxis stroke="hsl(var(--foreground))" opacity={0.6} fontSize={12} tickFormatter={(v) => `R$ ${Math.round(v / 1000)}k`} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                      formatter={(v: number) => brl(v)}
                    />
                    <Legend />
                    <Bar dataKey="income" name="Receitas" fill="#22C55E" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" name="Despesas" fill="#EF4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          {/* RECEIVABLES */}
          <TabsContent value="receivables" className="mt-6">
            <TxTable
              rows={txs.filter((t) => t.kind === "income")}
              clientName={clientName}
              onTogglePaid={(id, paid) => togglePaid.mutate({ id, paid })}
              onDelete={(id) => delTx.mutate(id)}
              emptyText="Nenhuma receita lançada."
            />
          </TabsContent>

          {/* PAYABLES */}
          <TabsContent value="payables" className="mt-6">
            <TxTable
              rows={txs.filter((t) => t.kind === "expense")}
              clientName={clientName}
              onTogglePaid={(id, paid) => togglePaid.mutate({ id, paid })}
              onDelete={(id) => delTx.mutate(id)}
              emptyText="Nenhuma despesa lançada."
            />
          </TabsContent>

          {/* CONTRACTS */}
          <TabsContent value="contracts" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setOpenContract(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full h-10 px-5 gap-2">
                <Plus className="size-4" /> Novo contrato
              </Button>
            </div>
            {contracts.length === 0 ? (
              <Empty text="Nenhum contrato recorrente." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contracts.map((c) => (
                  <div key={c.id} className="bg-surface border border-border rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-foreground/40">
                          {clientName(c.client_id)}
                        </div>
                        <div className="font-display font-semibold truncate">{c.title}</div>
                      </div>
                      <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                        {c.status === "active" ? "Ativo" : c.status}
                      </Badge>
                    </div>
                    <div className="mt-4 font-display text-2xl font-bold text-primary">{brl(Number(c.monthly_value))}<span className="text-xs text-foreground/40 font-sans font-normal">/mês</span></div>
                    <div className="mt-2 text-xs text-foreground/50">Cobrança dia {c.billing_day} · Início {new Date(c.start_date).toLocaleDateString("pt-BR")}</div>
                    <button
                      onClick={() => delContract.mutate(c.id)}
                      className="mt-4 text-xs text-foreground/40 hover:text-rose-400 flex items-center gap-1"
                    >
                      <Trash2 className="size-3" /> Encerrar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ACCOUNTS */}
          <TabsContent value="accounts" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setOpenAcc(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full h-10 px-5 gap-2">
                <Plus className="size-4" /> Nova conta
              </Button>
            </div>
            {accounts.length === 0 ? (
              <Empty text="Nenhuma conta bancária cadastrada." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map((a) => {
                  const balance = accountBalance(a, txs);
                  return (
                    <div key={a.id} className="bg-surface border border-border rounded-2xl p-5 relative overflow-hidden">
                      <div
                        className="absolute inset-x-0 top-0 h-1"
                        style={{ background: a.color ?? "#FFBC45" }}
                      />
                      <div className="flex items-center gap-3">
                        <div
                          className="size-10 rounded-xl grid place-items-center"
                          style={{ background: `${a.color}22`, color: a.color ?? "#FFBC45" }}
                        >
                          <Wallet className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-display font-semibold truncate">{a.name}</div>
                          <div className="text-xs text-foreground/50 truncate">{a.bank ?? a.account_type}</div>
                        </div>
                      </div>
                      <div className="mt-4 font-display text-2xl font-bold">{brl(balance)}</div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-foreground/40 mt-1">
                        Saldo atual
                      </div>
                      <button
                        onClick={() => delAcc.mutate(a.id)}
                        className="mt-4 text-xs text-foreground/40 hover:text-rose-400 flex items-center gap-1"
                      >
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
      <NewContractDialog open={openContract} onOpenChange={setOpenContract} />
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
  tone?: "primary" | "success" | "danger";
}) {
  const toneStyles =
    tone === "success"
      ? "text-emerald-400"
      : tone === "danger"
        ? "text-rose-400"
        : tone === "primary"
          ? "text-primary"
          : "text-foreground";
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-foreground/50">
        <span>{label}</span>
        {icon}
      </div>
      <div className={`mt-3 font-display text-2xl font-bold ${toneStyles}`}>{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-border/60 rounded-2xl p-12 text-center text-foreground/50 text-sm">
      {text}
    </div>
  );
}

function TxTable({
  rows,
  clientName,
  onTogglePaid,
  onDelete,
  emptyText,
}: {
  rows: ReturnType<typeof Array.prototype.filter>;
  clientName: (id: string | null | undefined) => string;
  onTogglePaid: (id: string, paid: boolean) => void;
  onDelete: (id: string) => void;
  emptyText: string;
}) {
  if (rows.length === 0) return <Empty text={emptyText} />;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="grid grid-cols-12 px-5 py-3 text-[10px] font-mono uppercase tracking-wider text-foreground/40 border-b border-border">
        <div className="col-span-1">Status</div>
        <div className="col-span-4">Descrição</div>
        <div className="col-span-3">Cliente</div>
        <div className="col-span-2">Vencimento</div>
        <div className="col-span-2 text-right">Valor</div>
      </div>
      {rows.map((t: any) => {
        const overdue = t.status === "pending" && t.due_date < today;
        return (
          <div
            key={t.id}
            className="grid grid-cols-12 px-5 py-3 items-center border-b border-border/40 last:border-b-0 hover:bg-foreground/[0.02] group"
          >
            <button
              onClick={() => onTogglePaid(t.id, t.status !== "paid")}
              className="col-span-1"
              title={t.status === "paid" ? "Marcar como pendente" : "Marcar como pago"}
            >
              {t.status === "paid" ? (
                <CheckCircle2 className="size-5 text-emerald-400" />
              ) : (
                <Circle className={`size-5 ${overdue ? "text-rose-400" : "text-foreground/30"}`} />
              )}
            </button>
            <div className="col-span-4 min-w-0">
              <div className="text-sm font-medium truncate">{t.description}</div>
              {overdue && <div className="text-[10px] text-rose-400 font-mono uppercase">Em atraso</div>}
            </div>
            <div className="col-span-3 text-xs text-foreground/60 truncate">{clientName(t.client_id)}</div>
            <div className="col-span-2 text-xs text-foreground/60">
              {new Date(t.due_date).toLocaleDateString("pt-BR")}
            </div>
            <div className="col-span-2 text-right flex items-center justify-end gap-2">
              <span className={`font-display font-semibold ${t.kind === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                {t.kind === "income" ? "+" : "−"} {brl(Number(t.amount))}
              </span>
              <button
                onClick={() => onDelete(t.id)}
                className="opacity-0 group-hover:opacity-100 text-foreground/40 hover:text-rose-400"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
