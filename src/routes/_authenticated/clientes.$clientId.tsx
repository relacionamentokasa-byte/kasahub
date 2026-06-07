import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft, Calendar, Mail, Phone, Building2, FileText, Palette,
  Globe, Save, Loader2, UserPlus, Trash2, KeyRound, ExternalLink, Copy, Check, Pencil,
  DollarSign, Clock, FileSignature, Activity, Plus,
} from "lucide-react";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import { ExtraDemandsManager } from "@/components/contracts/ExtraDemandsManager";

import { ClientServicesManager } from "@/components/clients/ClientServicesManager";
import { ClientContracts } from "@/components/clients/ClientContracts";
import { ClientTimeline } from "@/components/clients/ClientTimeline";
import { toast } from "sonner";
import { fetchClient, fetchProjects, updateClient, fetchExtraDemands, fetchJobs, fetchJobStages } from "@/lib/ops-api";
import { supabase } from "@/integrations/supabase/client";
import { createPortalUser, deletePortalUser, resetPortalUserPassword } from "@/lib/portal-users.functions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { JobsBoard } from "@/components/jobs/JobsBoard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/clientes/$clientId")({
  head: () => ({ meta: [{ title: "Cliente — KASA HUB" }] }),
  component: ClientDetail,
});

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return d; }
};

function ClientDetail() {
  const { clientId } = useParams({ from: "/_authenticated/clientes/$clientId" });
  return <ClientDetailContent clientId={clientId} />;
}

export function ClientDetailContent({ clientId, embedded = false }: { clientId: string; embedded?: boolean }) {
  const [editOpen, setEditOpen] = useState(false);
  const sb = supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> };

  const { data: client } = useQuery({ queryKey: ["client", clientId], queryFn: () => fetchClient(clientId) });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", { clientId }],
    queryFn: () => fetchProjects({ clientId }),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts", clientId],
    queryFn: async () => {
      const { data, error } = await sb.from("contracts").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ["proposals", clientId],
    queryFn: async () => {
      const { data, error } = await sb.from("proposals").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
      if (error) return [];
      return data ?? [];
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", clientId],
    queryFn: async () => {
      const { data, error } = await sb.from("transactions").select("*").eq("client_id", clientId).order("due_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: demands = [] } = useQuery({
    queryKey: ["extra-demands", { clientId }],
    queryFn: () => fetchExtraDemands({ clientId }),
  });
  const { data: allJobs = [] } = useQuery({
    queryKey: ["jobs", { clientId }],
    queryFn: () => fetchJobs({ clientId }),
  });
  const { data: jobStages = [] } = useQuery({
    queryKey: ["job-stages"],
    queryFn: fetchJobStages,
  });
  const doneStageIds = new Set(jobStages.filter(s => s.is_done).map(s => s.id));



  const summary = useMemo(() => {
    type Contract = { status: string; monthly_value: number; billing_day: number; title: string; end_date: string | null };
    type Txn = { kind: string; status: string; amount: number; due_date: string };
    const activeContract = (contracts as Contract[]).find((c) => c.status === "active") ?? null;
    const monthly = (contracts as Contract[])
      .filter((c) => c.status === "active")
      .reduce((s, c) => s + Number(c.monthly_value || 0), 0);
    const today = new Date();
    let nextDue: Date | null = null;
    if (activeContract) {
      const d = new Date(today.getFullYear(), today.getMonth(), activeContract.billing_day);
      if (d < today) d.setMonth(d.getMonth() + 1);
      nextDue = d;
    }
    const pendingTotal = (transactions as Txn[])
      .filter((t) => t.status === "pending")
      .reduce((s, t) => s + (t.kind === "income" ? Number(t.amount) : -Number(t.amount)), 0);
    const extraTotal = demands
      .filter((d) => d.status === "approved" || d.status === "completed" || d.status === "in_production")
      .reduce((s, d) => s + Number(d.value), 0);
    return { activeContract, monthly, nextDue, pendingTotal, extraTotal };
  }, [contracts, transactions, demands]);


  if (!client) return <div className="p-10 text-foreground/40">Carregando…</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 lg:px-10 pt-6 pb-4">
        {!embedded && (
          <Link
            to="/clientes"
            className="inline-flex items-center gap-1.5 text-xs text-foreground/50 hover:text-primary mb-4 capitalize"
          >
            <ArrowLeft className="size-3.5" /> Clientes
          </Link>
        )}
        <div className="flex items-start gap-4 flex-wrap">
          {client.logo_url ? (
            <img
              src={client.logo_url}
              alt=""
              className="size-16 rounded-2xl object-cover shrink-0 border border-border"
            />
          ) : (
            <div
              className="size-16 rounded-2xl grid place-items-center font-display font-bold text-2xl shrink-0"
              style={{ background: `${client.brand_primary}22`, color: client.brand_primary ?? "#FFBC45" }}
            >
              {(client.company || client.name).charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="text-primary text-[10px] capitalize">
              Cliente · 360°
            </span>
            <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">
              {client.company || client.name}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-foreground/50">
              <span className={`inline-flex items-center gap-1.5 capitalize text-[10px] px-2 py-0.5 rounded ${client.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                ● {client.status === "active" ? "Ativo" : client.status}
              </span>
              {client.email && <span className="inline-flex items-center gap-1.5"><Mail className="size-3" />{client.email}</span>}
              {client.phone && <span className="inline-flex items-center gap-1.5"><Phone className="size-3" />{client.phone}</span>}
              {client.document && <span className="inline-flex items-center gap-1.5"><Building2 className="size-3" />{client.document}</span>}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="shrink-0">
            <Pencil className="size-4 mr-1.5" /> Editar
          </Button>
        </div>

        {/* KPI bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <KPI icon={<DollarSign className="size-3.5" />} label="Valor mensal" value={summary.monthly > 0 ? BRL(summary.monthly) : "—"} />
          <KPI icon={<FileSignature className="size-3.5" />} label="Contrato" value={summary.activeContract?.title ?? "Sem contrato"} />
          <KPI icon={<Clock className="size-3.5" />} label="Próx. vencimento" value={summary.nextDue ? fmtDate(summary.nextDue.toISOString()) : "—"} />
          <KPI icon={<Activity className="size-3.5" />} label="DMEs Ativas" value={String(demands?.filter(d => d.status !== 'completed' && d.status !== 'cancelled').length ?? 0)} />

        </div>
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col">
        <div className="px-6 lg:px-10 border-b border-border overflow-x-auto">
          <TabsList className="bg-transparent border-0 h-auto p-0 gap-1">
            {[
              ["overview", "Resumo"],
              ["contracts", "Contratos"],
              ["projects", "Projetos"],
              ["jobs", "Jobs"],
              ["finance", "Financeiro"],
              ["proposals", "Propostas"],
              ["dme", "Demandas Extras"],
              ["portal", "Portal"],
              ["files", "Arquivos"],
              ["timeline", "Timeline"],

              ["servicos", "Serviços"],
              ["calendar", "Calendário"],
              ["branding", "Branding"],
            ].map(([v, label]) => (
              <TabsTrigger
                key={v}
                value={v}
                className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-3 py-2.5 text-xs capitalize whitespace-nowrap"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="servicos" className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 mt-0">
          <ClientServicesManager clientId={clientId} />
        </TabsContent>

        <TabsContent value="contracts" className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 mt-0">
          <ClientContracts clientId={clientId} />
        </TabsContent>

        <TabsContent value="overview" className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card label="Projetos" value={projects.length} />
            <Card label="Contratos Ativos" value={contracts.filter((c: any) => c.status === "active").length} />
            <Card label="Jobs Pendentes" value={allJobs.filter(j => !j.done_at).length} />
            <Card label="Receita Extra (R$)" value={summary.extraTotal > 0 ? BRL(summary.extraTotal) : "—"} />
          </div>
          {client.notes && (
            <div className="mt-6 bg-surface border border-border rounded-2xl p-5">
              <div className="text-[10px] capitalize text-foreground/50 mb-2 flex items-center gap-1.5">
                <FileText className="size-3" /> Observações
              </div>
              <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="projects" className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 mt-0">
          {projects.length === 0 ? (
            <p className="text-foreground/40 text-sm italic">Nenhum projeto operacional para este cliente.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => {
                const contract = (contracts as any[]).find(c => c.id === p.contract_id);
                const pJobs = (allJobs as any[]).filter(j => j.project_id === p.id);
                const total = pJobs.length;
                const done = pJobs.filter(j => !!j.done_at || (j.stage_id && doneStageIds.has(j.stage_id))).length;
                const progress = total === 0 ? 0 : Math.round((done / total) * 100);
                
                return (
                  <Link
                    key={p.id}
                    to="/projetos/$projectId"
                    params={{ projectId: p.id }}
                    className="bg-surface border border-border rounded-2xl p-5 hover:border-primary/50 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="size-1.5 rounded-full" style={{ background: p.color || '#FFBC45' }} />
                        <span className="text-[9px] uppercase font-bold text-foreground/40 tracking-wider">
                          {p.status} · {p.type === 'special' ? 'Especial' : 'Automático'}
                        </span>
                      </div>
                      <div className="font-display font-bold text-lg leading-tight mb-2 group-hover:text-primary transition-colors">{p.name}</div>
                      {contract && (
                        <div className="text-[10px] text-primary flex items-center gap-1.5 uppercase font-bold tracking-widest mb-4">
                          <FileSignature className="size-3" /> {contract.title}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Sub-lista de Jobs vinculados */}
                      <div className="space-y-1">
                        {pJobs.slice(0, 3).map(j => (
                          <div key={j.id} className="flex items-center justify-between text-[9px] text-foreground/50 border-b border-border/30 pb-1">
                            <span className="truncate pr-2">{j.title}</span>
                            <span className={j.done_at ? "text-emerald-500" : "text-amber-500"}>
                              {j.done_at ? "OK" : "Pendente"}
                            </span>
                          </div>
                        ))}
                        {pJobs.length > 3 && <div className="text-[8px] text-foreground/30 text-center pt-1">+ {pJobs.length - 3} jobs</div>}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] text-foreground/40 font-mono-kasa">Progresso Geral</span>
                          <span className="text-[10px] font-bold text-primary font-mono-kasa">{progress}%</span>
                        </div>
                        <div className="h-1 bg-background rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>


        <TabsContent value="jobs" className="flex-1 mt-0 min-h-0">
          <JobsBoard clientId={clientId} title="Jobs do Cliente" eyebrow="Cliente · Operação" />
        </TabsContent>

        <TabsContent value="finance" className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 mt-0 space-y-6">
          {(() => {
            const txList = transactions as Array<{ id: string; description: string; kind: string; status: string; due_date: string; amount: number }>;
            const income = txList.filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
            const expense = txList.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
            const profit = income - expense;
            const margin = income > 0 ? (profit / income) * 100 : 0;
            const jobsCount = (projects as Array<{ id: string }>).reduce((s) => s, 0);
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-surface border border-border rounded-xl p-4">
                  <div className="text-[10px] uppercase text-foreground/50">Receita total</div>
                  <div className="font-display text-xl font-bold text-emerald-400 mt-1">{BRL(income)}</div>
                </div>
                <div className="bg-surface border border-border rounded-xl p-4">
                  <div className="text-[10px] uppercase text-foreground/50">Despesas vinculadas</div>
                  <div className="font-display text-xl font-bold text-rose-400 mt-1">{BRL(expense)}</div>
                </div>
                <div className="bg-surface border border-border rounded-xl p-4">
                  <div className="text-[10px] uppercase text-foreground/50">Lucro</div>
                  <div className={`font-display text-xl font-bold mt-1 ${profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{BRL(profit)}</div>
                </div>
                <div className="bg-surface border border-border rounded-xl p-4">
                  <div className="text-[10px] uppercase text-foreground/50">Margem · Projetos</div>
                  <div className="font-display text-xl font-bold text-primary mt-1">{margin.toFixed(1)}% · {projects.length}</div>
                </div>
              </div>
            );
          })()}

          {transactions.length === 0 ? (
            <p className="text-foreground/40 text-sm">Nenhum lançamento financeiro para este cliente.</p>
          ) : (
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="text-left text-[10px] capitalize text-foreground/40 border-b border-border">
                  <tr>
                    <th className="py-2.5 px-4">Descrição</th>
                    <th className="py-2.5 px-4">Origem</th>
                    <th className="py-2.5 px-4">Tipo</th>
                    <th className="py-2.5 px-4">Vencimento</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {(transactions as Array<{ id: string; description: string; kind: string; status: string; due_date: string; amount: number; contract_id: string }>).map((t) => {
                    const contract = (contracts as any[]).find(c => c.id === t.contract_id);
                    return (
                      <tr key={t.id} className="border-b border-border/40">
                        <td className="py-3 px-4">{t.description}</td>
                        <td className="py-3 px-4 text-[10px] text-foreground/50 uppercase">
                          {contract ? (
                            <span className="flex items-center gap-1"><FileSignature className="size-3 text-primary" /> {contract.title}</span>
                          ) : (t as any).dme_id ? (
                            <span className="flex items-center gap-1 text-primary">DME {(t as any).origin === 'independent' ? '(Independente)' : '(Extra)'}</span>
                          ) : "—"}

                        </td>
                        <td className="py-3 px-4 text-foreground/60">{t.kind === "income" ? "Receita" : "Despesa"}</td>
                        <td className="py-3 px-4 text-foreground/60">{fmtDate(t.due_date)}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] capitalize px-2 py-1 rounded ${t.status === "paid" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                            {t.status === "paid" ? "Pago" : "Pendente"}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-right ${t.kind === "income" ? "text-emerald-400" : "text-foreground/80"}`}>
                          {t.kind === "income" ? "+" : "−"} {BRL(Number(t.amount))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>


        <TabsContent value="dme" className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 mt-0">
          <ExtraDemandsManager clientId={clientId} />
        </TabsContent>

        <TabsContent value="proposals" className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 mt-0">

          {proposals.length === 0 ? (
            <p className="text-foreground/40 text-sm">Nenhuma proposta vinculada a este cliente.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(proposals as Array<{ id: string; title: string; status: string; total: number; created_at: string }>).map((p) => (
                <Link
                  key={p.id}
                  to="/propostas/$proposalId"
                  params={{ proposalId: p.id }}
                  className="bg-surface border border-border rounded-2xl p-5 hover:border-primary/50 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-display font-semibold truncate">{p.title}</div>
                      <div className="text-xs text-foreground/50 mt-0.5">{fmtDate(p.created_at)}</div>
                    </div>
                    <span className="text-[10px] capitalize px-2 py-1 rounded bg-muted text-muted-foreground shrink-0">{p.status}</span>
                  </div>
                  <div className="mt-3 text-primary">{BRL(Number(p.total))}</div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="files" className="px-6 lg:px-10 py-6 mt-0 text-foreground/40 text-sm">
          Arquivos do cliente — em breve.
        </TabsContent>

        <TabsContent value="calendar" className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 mt-0">
          <CalendarTab projects={projects} contracts={contracts} nextDue={summary.nextDue} clientId={clientId} />
        </TabsContent>

        <TabsContent value="timeline" className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 mt-0">
          <TimelineTab clientId={clientId} />
        </TabsContent>

        <TabsContent value="portal" className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 mt-0">
          <PortalTab clientId={clientId} />
        </TabsContent>

        <TabsContent value="branding" className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 mt-0">
          <BrandingTab clientId={clientId} />
        </TabsContent>
      </Tabs>

      <EditClientDialog client={client} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}

function KPI({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3">
      <div className="text-[10px] capitalize text-foreground/40 flex items-center gap-1.5">
        {icon} {label}
      </div>
      <div className="font-display text-lg font-bold mt-1 truncate">{value}</div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="text-[10px] capitalize text-foreground/50 mb-2">{label}</div>
      <div className="font-display text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

type ProjectLike = { id: string; name: string; due_date: string | null; status: string };
type ContractLike = { id: string; title: string; billing_day: number; end_date: string | null; status: string };

function CalendarTab({ projects, contracts, nextDue }: { projects: ProjectLike[]; contracts: ContractLike[]; nextDue: Date | null; clientId: string }) {
  const events = [
    ...(nextDue ? [{ date: nextDue.toISOString().slice(0, 10), label: "Vencimento do contrato", kind: "billing" }] : []),
    ...projects.filter((p) => p.due_date).map((p) => ({ date: p.due_date!, label: `Entrega · ${p.name}`, kind: "project" })),
    ...contracts.filter((c) => c.end_date).map((c) => ({ date: c.end_date!, label: `Fim do contrato · ${c.title}`, kind: "contract" })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  if (events.length === 0) return <p className="text-foreground/40 text-sm">Nenhum evento agendado para este cliente.</p>;
  return (
    <ul className="space-y-2">
      {events.map((e, i) => (
        <li key={i} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="text-center min-w-[60px]">
            <div className="text-[10px] capitalize text-foreground/40">{new Date(e.date).toLocaleDateString("pt-BR", { month: "short" })}</div>
            <div className="font-display text-2xl font-bold">{new Date(e.date).getDate()}</div>
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">{e.label}</div>
            <div className="text-[10px] capitalize text-foreground/40">{e.kind}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function TimelineTab({ clientId }: { clientId: string }) {
  return (
    <div className="max-w-2xl py-2">
      <ClientTimeline clientId={clientId} />
    </div>
  );
}

function BrandingTab({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const { data: client } = useQuery({ queryKey: ["client", clientId], queryFn: () => fetchClient(clientId) });
  const [form, setForm] = useState({ brand_primary: "#FFBC45", brand_secondary: "#0C1618", logo_url: "", banner_url: "" });

  useEffect(() => {
    if (client) setForm({
      brand_primary: client.brand_primary ?? "#FFBC45",
      brand_secondary: client.brand_secondary ?? "#0C1618",
      logo_url: client.logo_url ?? "",
      banner_url: client.banner_url ?? "",
    });
  }, [client]);

  const mut = useMutation({
    mutationFn: () => updateClient(clientId, form),
    onSuccess: () => { toast.success("Branding atualizado"); qc.invalidateQueries({ queryKey: ["client", clientId] }); qc.invalidateQueries({ queryKey: ["clients"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!client) return null;
  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <span className="text-[10px] capitalize text-primary font-semibold">Cliente · Branding</span>
        <h2 className="font-display text-2xl font-bold mt-1 flex items-center gap-2"><Palette className="size-5 text-primary" /> Identidade visual</h2>
        <p className="text-sm text-foreground/60 mt-1">Cores, logo e banner usados em propostas, portal e materiais.</p>
      </header>
      <div className="bg-surface border border-border rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Cor primária">
          <div className="flex gap-2">
            <Input type="color" value={form.brand_primary} onChange={(e) => setForm({ ...form, brand_primary: e.target.value })} className="w-16 p-1 h-10" />
            <Input value={form.brand_primary} onChange={(e) => setForm({ ...form, brand_primary: e.target.value })} />
          </div>
        </Field>
        <Field label="Cor secundária">
          <div className="flex gap-2">
            <Input type="color" value={form.brand_secondary} onChange={(e) => setForm({ ...form, brand_secondary: e.target.value })} className="w-16 p-1 h-10" />
            <Input value={form.brand_secondary} onChange={(e) => setForm({ ...form, brand_secondary: e.target.value })} />
          </div>
        </Field>
        <Field label="Logo (URL)">
          <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" />
        </Field>
        <Field label="Banner (URL)">
          <Input value={form.banner_url} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} placeholder="https://…" />
        </Field>
      </div>
      <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="gap-2">
        {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar branding
      </Button>
      <div className="rounded-2xl overflow-hidden border border-border">
        <div className="h-28" style={{ background: form.banner_url ? `url(${form.banner_url}) center/cover` : `linear-gradient(135deg, ${form.brand_primary}, ${form.brand_secondary})` }} />
        <div className="p-5 bg-background/40 flex items-center gap-3">
          {form.logo_url ? (
            <img src={form.logo_url} alt="" className="size-12 rounded-lg object-cover" />
          ) : (
            <div className="size-12 rounded-lg grid place-items-center font-display font-bold" style={{ background: `${form.brand_primary}30`, color: form.brand_primary }}>
              {client.name[0]}
            </div>
          )}
          <div>
            <div className="font-display font-semibold">{client.company || client.name}</div>
            <div className="text-[10px] capitalize text-foreground/40">Preview do branding</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Portal do Cliente — aba do cadastro
// ============================================================================

export function PortalTab({ clientId }: { clientId: string }) {
  return (
    <div className="space-y-8 max-w-5xl">
      <header>
        <span className="text-[10px] capitalize text-primary font-semibold">
          Cliente · Portal exclusivo
        </span>
        <h2 className="font-display text-2xl font-bold mt-1">Portal do Cliente</h2>
        <p className="text-sm text-foreground/60 mt-1">
          Ambiente exclusivo de acesso para este cliente, consumindo automaticamente os dados da operação.
        </p>
      </header>

      <PortalSettings clientId={clientId} />
      <PortalUsers clientId={clientId} />
      <PortalContent clientId={clientId} />
    </div>
  );
}

function PortalSettings({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const { data: client } = useQuery({ queryKey: ["client", clientId], queryFn: () => fetchClient(clientId) });
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (client) setForm({
      portal_enabled: client.portal_enabled ?? false,
      portal_slug: client.portal_slug ?? "",
      logo_url: client.logo_url ?? "",
      banner_url: client.banner_url ?? "",
      portal_cover_url: client.portal_cover_url ?? "",
      brand_primary: client.brand_primary ?? "#FFBC45",
      brand_secondary: client.brand_secondary ?? "#0C1618",
    });
  }, [client]);

  const mut = useMutation({
    mutationFn: () => updateClient(clientId, form),
    onSuccess: () => {
      toast.success("Configurações do portal salvas");
      qc.invalidateQueries({ queryKey: ["client", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  if (!client) return null;

  const slug = (form.portal_slug as string) || "";
  const portalUrl =
    typeof window !== "undefined" && slug ? `${window.location.origin}/portal` : "";

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h3 className="font-display text-lg font-semibold">Configurações do portal</h3>
          <p className="text-xs text-foreground/50">Branding, URL e ativação.</p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="portal_enabled" className="text-xs text-foreground/70">
            {form.portal_enabled ? "Ativo" : "Inativo"}
          </Label>
          <Switch
            id="portal_enabled"
            checked={!!form.portal_enabled}
            onCheckedChange={(v) => set("portal_enabled", v)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="URL personalizada (slug)">
          <div className="flex gap-2">
            <Input
              value={(form.portal_slug as string) ?? ""}
              onChange={(e) => set("portal_slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              placeholder="nome-do-cliente"
            />
            {portalUrl && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(portalUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                title="Copiar URL"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            )}
          </div>
          {portalUrl && (
            <p className="text-[10px] text-foreground/40 mt-1">{portalUrl}</p>
          )}
        </Field>

        <Field label="Cor primária">
          <div className="flex gap-2">
            <Input type="color" value={(form.brand_primary as string) ?? "#FFBC45"} onChange={(e) => set("brand_primary", e.target.value)} className="w-16 p-1 h-10" />
            <Input value={(form.brand_primary as string) ?? ""} onChange={(e) => set("brand_primary", e.target.value)} />
          </div>
        </Field>

        <Field label="Cor secundária">
          <div className="flex gap-2">
            <Input type="color" value={(form.brand_secondary as string) ?? "#0C1618"} onChange={(e) => set("brand_secondary", e.target.value)} className="w-16 p-1 h-10" />
            <Input value={(form.brand_secondary as string) ?? ""} onChange={(e) => set("brand_secondary", e.target.value)} />
          </div>
        </Field>

        <Field label="Logo do cliente (URL)">
          <Input value={(form.logo_url as string) ?? ""} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://…" />
        </Field>

        <Field label="Banner do portal (URL)">
          <Input value={(form.banner_url as string) ?? ""} onChange={(e) => set("banner_url", e.target.value)} placeholder="https://…" />
        </Field>

        <Field label="Imagem de capa (URL)">
          <Input value={(form.portal_cover_url as string) ?? ""} onChange={(e) => set("portal_cover_url", e.target.value)} placeholder="https://…" />
        </Field>
      </div>

      <div className="flex items-center gap-3 mt-6 flex-wrap">
        <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="gap-2">
          {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar
        </Button>
        {Boolean(form.portal_enabled) && (
          <a
            href="/portal"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            Abrir portal <ExternalLink className="size-3" />
          </a>
        )}
      </div>

      {Boolean(form.banner_url || form.logo_url) && (
        <div className="mt-6 rounded-lg overflow-hidden border border-border">
          <div
            className="h-24 relative"
            style={{
              background: form.banner_url
                ? `url(${form.banner_url}) center/cover`
                : `linear-gradient(135deg, ${form.brand_primary}40, ${form.brand_primary}10)`,
            }}
          />
          <div className="p-4 flex items-center gap-3 bg-background/40">
            {form.logo_url ? (
              <img src={form.logo_url as string} alt="" className="size-10 rounded-md object-cover" />
            ) : (
              <div className="size-10 rounded-md grid place-items-center font-display font-bold" style={{ background: `${form.brand_primary}30`, color: form.brand_primary as string }}>
                {client.name[0]}
              </div>
            )}
            <div>
              <p className="text-sm font-medium">{client.name}</p>
              <p className="text-[10px] text-foreground/40 capitalize">Preview</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

type PortalUser = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  phone: string | null;
  permissions: Record<string, boolean>;
  status: string;
  auth_user_id: string | null;
};

function PortalUsers({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const sb = supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> };
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["portal-users", clientId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("client_portal_users")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PortalUser[];
    },
  });

  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState<PortalUser | null>(null);

  const del = useServerFn(deletePortalUser);
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { portal_user_id: id } }),
    onSuccess: () => {
      toast.success("Usuário removido");
      qc.invalidateQueries({ queryKey: ["portal-users", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h3 className="font-display text-lg font-semibold">Usuários do cliente</h3>
          <p className="text-xs text-foreground/50">
            Cada usuário acessa apenas as informações deste cliente.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <UserPlus className="size-4" /> Novo usuário
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-foreground/40">Carregando…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-foreground/40">Nenhum usuário cadastrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] capitalize text-foreground/40 border-b border-border">
              <tr>
                <th className="py-2 pr-3">Nome</th>
                <th className="py-2 pr-3">E-mail</th>
                <th className="py-2 pr-3">Cargo</th>
                <th className="py-2 pr-3">Telefone</th>
                <th className="py-2 pr-3">Acesso</th>
                <th className="py-2 pr-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/50">
                  <td className="py-3 pr-3 font-medium">{u.name}</td>
                  <td className="py-3 pr-3 text-foreground/70">{u.email}</td>
                  <td className="py-3 pr-3 text-foreground/60">{u.role ?? "—"}</td>
                  <td className="py-3 pr-3 text-foreground/60">{u.phone ?? "—"}</td>
                  <td className="py-3 pr-3">
                    <span className={`text-[10px] capitalize px-2 py-1 rounded ${u.auth_user_id ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                      {u.auth_user_id ? "Ativo" : "Pendente"}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => setResetting(u)} title="Redefinir senha">
                      <KeyRound className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { if (confirm(`Remover ${u.name}?`)) delMut.mutate(u.id); }}
                      title="Remover"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewPortalUserDialog open={open} onOpenChange={setOpen} clientId={clientId} isFirst={users.length === 0} />
      <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />
    </section>
  );
}

function NewPortalUserDialog({
  open, onOpenChange, clientId, isFirst,
}: { open: boolean; onOpenChange: (v: boolean) => void; clientId: string; isFirst: boolean }) {
  const qc = useQueryClient();
  const create = useServerFn(createPortalUser);
  const [form, setForm] = useState({
    name: "", email: "", role: "", phone: "", password: "",
    permissions: { approvals: true, projects: true, jobs: true, calendar: true, files: true, reports: true },
    set_primary: isFirst,
  });

  useEffect(() => {
    if (open) setForm((f) => ({ ...f, set_primary: isFirst }));
  }, [open, isFirst]);

  const mut = useMutation({
    mutationFn: () => create({ data: { client_id: clientId, ...form } }),
    onSuccess: () => {
      toast.success("Usuário do portal criado");
      qc.invalidateQueries({ queryKey: ["portal-users", clientId] });
      qc.invalidateQueries({ queryKey: ["client", clientId] });
      onOpenChange(false);
      setForm({
        name: "", email: "", role: "", phone: "", password: "",
        permissions: { approvals: true, projects: true, jobs: true, calendar: true, files: true, reports: true },
        set_primary: false,
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo usuário do portal</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nome"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Cargo"><Input value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="Diretor de Marketing" /></Field>
          <Field label="Telefone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Senha (mín. 8)" className="sm:col-span-2">
            <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} minLength={8} />
          </Field>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] capitalize text-foreground/60">Permissões</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            {(["approvals","projects","jobs","calendar","files","reports"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 border border-border rounded-md px-3 py-2 cursor-pointer">
                <Switch
                  checked={form.permissions[k]}
                  onCheckedChange={(v) => set("permissions", { ...form.permissions, [k]: v })}
                />
                <span className="capitalize">
                  {{ approvals: "Aprovações", projects: "Projetos", jobs: "Jobs", calendar: "Calendário", files: "Arquivos", reports: "Relatórios" }[k]}
                </span>
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !form.name || !form.email || form.password.length < 8} className="gap-2">
            {mut.isPending && <Loader2 className="size-4 animate-spin" />} Criar acesso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: PortalUser | null; onClose: () => void }) {
  const [pwd, setPwd] = useState("");
  const reset = useServerFn(resetPortalUserPassword);
  const mut = useMutation({
    mutationFn: () => reset({ data: { portal_user_id: user!.id, password: pwd } }),
    onSuccess: () => { toast.success("Senha atualizada"); setPwd(""); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Redefinir senha · {user?.name}</DialogTitle></DialogHeader>
        <Field label="Nova senha (mín. 8)">
          <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} minLength={8} />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={pwd.length < 8 || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending && <Loader2 className="size-4 animate-spin mr-2" />} Atualizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PortalContent({ clientId }: { clientId: string }) {
  const sb = supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> };
  const { data: counts } = useQuery({
    queryKey: ["portal-counts", clientId],
    queryFn: async () => {
      const [approvals, projects, jobs] = await Promise.all([
        sb.from("approvals" as never).select("id", { count: "exact", head: true }).eq("client_id", clientId as never),
        sb.from("projects").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        sb.from("jobs").select("id", { count: "exact", head: true }).eq("client_id", clientId),
      ]);
      return {
        approvals: (approvals as { count?: number }).count ?? 0,
        projects: (projects as { count?: number }).count ?? 0,
        jobs: (jobs as { count?: number }).count ?? 0,
      };
    },
  });

  const items = [
    { key: "approvals", label: "Aprovações", count: counts?.approvals ?? 0 },
    { key: "projects", label: "Projetos", count: counts?.projects ?? 0 },
    { key: "jobs", label: "Jobs", count: counts?.jobs ?? 0 },
    { key: "calendar", label: "Calendário", count: null },
    { key: "files", label: "Arquivos", count: null },
    { key: "timeline", label: "Timeline", count: null },
    { key: "reports", label: "Relatórios", count: null },
  ];

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <div className="mb-4">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <Globe className="size-4 text-primary" /> Conteúdo do portal
        </h3>
        <p className="text-xs text-foreground/50">
          Tudo é filtrado automaticamente por este cliente. Os dados vêm da operação da Kasa.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((it) => (
          <div key={it.key} className="rounded-lg border border-border bg-background/40 p-4">
            <p className="text-[10px] capitalize text-foreground/40">{it.label}</p>
            <p className="font-display text-2xl font-bold mt-1">
              {it.count ?? <span className="text-foreground/30 text-sm font-normal">em breve</span>}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-[10px] capitalize text-foreground/60">{label}</Label>
      {children}
    </div>
  );
}
