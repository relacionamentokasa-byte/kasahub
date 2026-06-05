import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, TrendingUp, Users, Briefcase, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  brl,
  computeIndicators,
  fetchContracts,
  fetchTransactions,
} from "@/lib/finance-api";
import { fetchClients, fetchJobs, fetchJobStages, fetchProjects } from "@/lib/ops-api";
import { supabase } from "@/integrations/supabase/client";
import { downloadCSV, toCSV } from "@/lib/csv";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — KASA OS" }] }),
  component: RelatoriosPage,
});

async function fetchLeads() {
  const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
async function fetchLeadStages() {
  const { data, error } = await supabase.from("lead_stages").select("*").order("order_index");
  if (error) throw error;
  return data ?? [];
}

function RelatoriosPage() {
  const { data: txs = [] } = useQuery({ queryKey: ["transactions"], queryFn: () => fetchTransactions() });
  const { data: contracts = [] } = useQuery({ queryKey: ["contracts"], queryFn: () => fetchContracts() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => fetchJobs() });
  const { data: jobStages = [] } = useQuery({ queryKey: ["job_stages"], queryFn: fetchJobStages });
  const { data: leads = [] } = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
  const { data: leadStages = [] } = useQuery({ queryKey: ["lead_stages"], queryFn: fetchLeadStages });

  const ind = computeIndicators(txs, contracts);
  const clientName = (id: string | null | undefined) => clients.find((c) => c.id === id)?.company || clients.find((c) => c.id === id)?.name || "—";
  const stageName = (id: string | null | undefined) => leadStages.find((s) => s.id === id)?.name || "—";
  const jobStage = (id: string | null | undefined) => jobStages.find((s) => s.id === id)?.name || "—";

  const exportFinancial = () => {
    const rows = txs.map((t) => ({
      Tipo: t.kind === "income" ? "Receita" : "Despesa",
      Descrição: t.description,
      Valor: Number(t.amount).toFixed(2),
      Vencimento: t.due_date,
      Pagamento: t.paid_at ?? "",
      Status: t.status,
      Cliente: clientName(t.client_id),
    }));
    downloadCSV(`financeiro_${Date.now()}.csv`, toCSV(rows));
  };
  const exportCommercial = () => {
    const rows = leads.map((l) => ({
      Nome: l.name, Empresa: l.company ?? "", Email: l.email ?? "", Telefone: l.phone ?? "",
      Origem: l.source ?? "", Etapa: stageName(l.stage_id), Valor: Number(l.value).toFixed(2),
      Criado_em: l.created_at,
    }));
    downloadCSV(`comercial_leads_${Date.now()}.csv`, toCSV(rows));
  };
  const exportOps = () => {
    const rows = jobs.map((j) => ({
      Título: j.title, Etapa: jobStage(j.stage_id), Prioridade: j.priority,
      Cliente: clientName(j.client_id), Vencimento: j.due_date ?? "",
      Concluído_em: j.done_at ?? "", Criado_em: j.created_at,
    }));
    downloadCSV(`operacional_jobs_${Date.now()}.csv`, toCSV(rows));
  };
  const exportPerClient = () => {
    const rows = clients.map((c) => {
      const cTxs = txs.filter((t) => t.client_id === c.id);
      const income = cTxs.filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
      const paid = cTxs.filter((t) => t.kind === "income" && t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);
      const overdue = cTxs.filter((t) => t.kind === "income" && t.status === "pending" && t.due_date < new Date().toISOString().slice(0, 10))
        .reduce((s, t) => s + Number(t.amount), 0);
      const contractValue = contracts.filter((ct) => ct.client_id === c.id && ct.status === "active").reduce((s, ct) => s + Number(ct.monthly_value), 0);
      const projCount = projects.filter((p) => p.client_id === c.id).length;
      const jobCount = jobs.filter((j) => j.client_id === c.id).length;
      return {
        Cliente: c.company || c.name, Email: c.email ?? "", Status: c.status,
        MRR: contractValue.toFixed(2), Faturado: income.toFixed(2),
        Recebido: paid.toFixed(2), Inadimplente: overdue.toFixed(2),
        Projetos: projCount, Jobs: jobCount,
      };
    });
    downloadCSV(`por_cliente_${Date.now()}.csv`, toCSV(rows));
  };

  // Per-client aggregates for top clients table
  const perClient = clients.map((c) => {
    const cTxs = txs.filter((t) => t.client_id === c.id && t.kind === "income");
    const total = cTxs.reduce((s, t) => s + Number(t.amount), 0);
    const mrr = contracts.filter((ct) => ct.client_id === c.id && ct.status === "active").reduce((s, ct) => s + Number(ct.monthly_value), 0);
    return { c, total, mrr, jobs: jobs.filter((j) => j.client_id === c.id).length };
  }).sort((a, b) => (b.total + b.mrr * 12) - (a.total + a.mrr * 12));

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 lg:px-10 pt-6 pb-4">
        <span className="text-primary text-[10px] font-mono uppercase tracking-[0.25em]">Gestão · Relatórios</span>
        <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight mt-1">Relatórios</h1>
        <p className="text-sm text-foreground/50 mt-2">Recortes de operação e exportação CSV.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 lg:px-10 pb-10">
        <Tabs defaultValue="financial" className="w-full">
          <TabsList className="bg-surface border border-border">
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="commercial">Comercial</TabsTrigger>
            <TabsTrigger value="ops">Operacional</TabsTrigger>
            <TabsTrigger value="clients">Por cliente</TabsTrigger>
          </TabsList>

          <TabsContent value="financial" className="mt-6 space-y-4">
            <ReportHeader title="Financeiro" subtitle={`${txs.length} lançamentos`} onExport={exportFinancial} icon={<Wallet className="size-5" />} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Receita mês" value={brl(ind.monthIncome)} />
              <StatCard label="Despesa mês" value={brl(ind.monthExpense)} />
              <StatCard label="Resultado" value={brl(ind.monthResult)} />
              <StatCard label="MRR" value={brl(ind.mrr)} />
            </div>
          </TabsContent>

          <TabsContent value="commercial" className="mt-6 space-y-4">
            <ReportHeader title="Comercial" subtitle={`${leads.length} leads`} onExport={exportCommercial} icon={<TrendingUp className="size-5" />} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {leadStages.map((s) => {
                const count = leads.filter((l) => l.stage_id === s.id).length;
                const total = leads.filter((l) => l.stage_id === s.id).reduce((sum, l) => sum + Number(l.value), 0);
                return <StatCard key={s.id} label={s.name} value={String(count)} hint={brl(total)} accent={s.color} />;
              })}
            </div>
          </TabsContent>

          <TabsContent value="ops" className="mt-6 space-y-4">
            <ReportHeader title="Operacional" subtitle={`${jobs.length} jobs · ${projects.length} projetos`} onExport={exportOps} icon={<Briefcase className="size-5" />} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {jobStages.slice(0, 8).map((s) => {
                const count = jobs.filter((j) => j.stage_id === s.id).length;
                return <StatCard key={s.id} label={s.name} value={String(count)} accent={s.color} />;
              })}
            </div>
          </TabsContent>

          <TabsContent value="clients" className="mt-6 space-y-4">
            <ReportHeader title="Por cliente" subtitle={`${clients.length} clientes`} onExport={exportPerClient} icon={<Users className="size-5" />} />
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-12 px-5 py-3 text-[10px] font-mono uppercase tracking-wider text-foreground/40 border-b border-border">
                <div className="col-span-4">Cliente</div>
                <div className="col-span-2 text-right">MRR</div>
                <div className="col-span-3 text-right">Receita total</div>
                <div className="col-span-1 text-right">Jobs</div>
                <div className="col-span-2 text-right">LTV estim.</div>
              </div>
              {perClient.map(({ c, total, mrr, jobs: jobCount }) => (
                <div key={c.id} className="grid grid-cols-12 px-5 py-3 items-center border-b border-border/40 last:border-b-0 hover:bg-foreground/[0.02]">
                  <div className="col-span-4 text-sm font-medium truncate">{c.company || c.name}</div>
                  <div className="col-span-2 text-right text-sm text-primary">{brl(mrr)}</div>
                  <div className="col-span-3 text-right text-sm">{brl(total)}</div>
                  <div className="col-span-1 text-right text-sm text-foreground/60">{jobCount}</div>
                  <div className="col-span-2 text-right text-sm font-display font-semibold">{brl(total + mrr * 12)}</div>
                </div>
              ))}
              {perClient.length === 0 && <div className="p-12 text-center text-sm text-foreground/50">Sem clientes cadastrados.</div>}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ReportHeader({ title, subtitle, onExport, icon }: { title: string; subtitle: string; onExport: () => void; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center">{icon}</div>
        <div>
          <div className="font-display text-lg font-semibold">{title}</div>
          <div className="text-xs text-foreground/50">{subtitle}</div>
        </div>
      </div>
      <Button onClick={onExport} variant="outline" className="border-border rounded-full h-10 px-4 gap-2">
        <Download className="size-4" /> Exportar CSV
      </Button>
    </div>
  );
}

function StatCard({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string | null }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 relative overflow-hidden">
      {accent && <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: accent }} />}
      <div className="text-[10px] font-mono uppercase tracking-wider text-foreground/50">{label}</div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      {hint && <div className="text-xs text-foreground/40 mt-1">{hint}</div>}
    </div>
  );
}
