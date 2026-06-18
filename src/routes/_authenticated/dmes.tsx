import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Trash2, Link as LinkIcon, Check, X, Loader2, Sparkles, Search, Filter, Briefcase,
} from "lucide-react";
import {
  fetchExtraDemands, createExtraDemandsBatch, deleteExtraDemand,
  approveExtraDemand, rejectExtraDemand, getDmePublicUrl, fetchClients,
} from "@/lib/ops-api";
import { supabase } from "@/integrations/supabase/client";
import { NewJobDialog } from "@/components/jobs/NewJobDialog";
import { fetchContracts } from "@/lib/finance-api";
import { fetchProfiles } from "@/lib/profile-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";


export const Route = createFileRoute("/_authenticated/dmes")({
  head: () => ({ meta: [{ title: "Demandas Extras — KASA HUB" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    clientId: (s.clientId as string) || undefined,
  }),
  component: DmesPage,
});

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft:      { label: "Rascunho",  cls: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
  sent:       { label: "Enviada",   cls: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  pending:    { label: "Aguardando", cls: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  approved:   { label: "Aprovada",  cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  rejected:   { label: "Recusada",  cls: "bg-red-500/10 text-red-500 border-red-500/20" },
  in_production: { label: "Em produção", cls: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  completed:  { label: "Concluída", cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
};

function DmesPage() {
  const { clientId: prefClientId } = useSearch({ from: "/_authenticated/dmes" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [jobForDme, setJobForDme] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: dmes = [], isLoading } = useQuery({
    queryKey: ["extra_demands", { status: statusFilter, clientId: prefClientId }],
    queryFn: () => fetchExtraDemands({ status: statusFilter, clientId: prefClientId }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const dmeIdsKey = useMemo(() => dmes.map((d: any) => d.id).sort().join(","), [dmes]);
  const { data: jobsByDme = {} } = useQuery({
    queryKey: ["jobs-by-dme", dmeIdsKey],
    enabled: dmeIdsKey.length > 0,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const ids = dmeIdsKey.split(",");
      const { data, error } = await supabase
        .from("jobs")
        .select("id, dme_id, title")
        .in("dme_id", ids);
      if (error) throw error;
      const map: Record<string, { id: string; title: string }> = {};
      (data ?? []).forEach((j: any) => { if (j.dme_id) map[j.dme_id] = { id: j.id, title: j.title }; });
      return map;
    },
  });


  const filtered = useMemo(
    () => dmes.filter((d: any) => !search || d.title?.toLowerCase().includes(search.toLowerCase()) || d.number_display?.toLowerCase().includes(search.toLowerCase())),
    [dmes, search]
  );

  const approveMut = useMutation({
    mutationFn: (id: string) => approveExtraDemand(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["extra_demands"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("DME aprovada · lançamento financeiro gerado.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectExtraDemand(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["extra_demands"] });
      toast.success("DME recusada");
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteExtraDemand(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["extra_demands"] });
      toast.success("DME removida");
    },
  });

  function copyLink(token: string) {
    navigator.clipboard.writeText(getDmePublicUrl(token));
    toast.success("Link copiado!");
  }

  return (
    <div className="p-6 lg:p-10 max-w-[1500px] mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Sparkles className="size-7 text-primary" /> Demandas Extras
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Solicitações pontuais fora do escopo do contrato. Cada DME gera um link de aprovação para o cliente e, ao ser aprovada, um lançamento financeiro automático.
          </p>
        </div>
        <Button onClick={() => setOpenNew(true)} className="gap-2">
          <Plus className="size-4" /> Nova DME
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><Filter className="size-3.5 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Aguardando aprovação</SelectItem>
            <SelectItem value="approved">Aprovadas</SelectItem>
            <SelectItem value="rejected">Recusadas</SelectItem>
            <SelectItem value="completed">Concluídas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Demanda</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10"><Loader2 className="size-5 animate-spin inline" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Sparkles className="size-10 opacity-30" />
                  <div>
                    <div className="font-medium text-foreground">Nenhuma DME cadastrada</div>
                    <div className="text-xs">Crie sua primeira demanda extra.</div>
                  </div>
                  <Button onClick={() => setOpenNew(true)} size="sm" className="gap-2 mt-2">
                    <Plus className="size-3.5" /> Nova DME
                  </Button>
                </div>
              </TableCell></TableRow>
            ) : filtered.map((d: any) => {
              const st = STATUS_LABEL[d.status] ?? { label: d.status, cls: "bg-muted text-muted-foreground" };
              const isPending = d.status !== "approved" && d.status !== "rejected" && d.status !== "completed";
              return (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{d.number_display}</TableCell>
                  <TableCell>
                    <div className="font-medium">{d.title}</div>
                    {d.description && <div className="text-xs text-muted-foreground line-clamp-1">{d.description}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{d.clients?.company || d.clients?.name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.contracts?.title || "—"}</TableCell>
                  <TableCell className="text-right font-mono">{brl(Number(d.value))}</TableCell>
                  <TableCell className="text-sm">{d.due_date ? new Date(d.due_date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={st.cls}>{st.label}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {(() => {
                        const linkedJob = jobsByDme[d.id];
                        if (linkedJob) {
                          return (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-blue-500"
                              onClick={() => navigate({ to: "/jobs", search: { openJobId: linkedJob.id } })}
                              title={`Abrir Job: ${linkedJob.title}`}
                            >
                              <Briefcase className="size-4" />
                            </Button>
                          );
                        }
                        return (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setJobForDme(d)}
                            title="Criar Job a partir desta DME"
                          >
                            <Briefcase className="size-4" />
                          </Button>
                        );
                      })()}
                      {d.public_token && (
                        <Button size="icon" variant="ghost" onClick={() => copyLink(d.public_token)} title="Copiar link de aprovação">
                          <LinkIcon className="size-4" />
                        </Button>
                      )}
                      {isPending && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => approveMut.mutate(d.id)} className="text-emerald-600" title="Aprovar internamente">
                            <Check className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => rejectMut.mutate(d.id)} className="text-red-500" title="Recusar">
                            <X className="size-4" />
                          </Button>
                        </>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir esta DME?")) delMut.mutate(d.id); }} className="text-red-500">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <NewDmeDialog open={openNew} onOpenChange={setOpenNew} defaultClientId={prefClientId} />

      <NewJobDialog
        stage={null}
        open={!!jobForDme}
        onOpenChange={(o) => { if (!o) setJobForDme(null); }}
        defaultClientId={jobForDme?.client_id}
        defaultDmeId={jobForDme?.id}
        defaultContractId={jobForDme?.contract_id ?? undefined}
        defaultTitle={jobForDme?.title ?? ""}
        defaultDescription={jobForDme?.description ?? ""}
        defaultDueDate={jobForDme?.due_date ?? ""}
        onCreated={(job) => {
          setJobForDme(null);
          navigate({ to: "/jobs", search: { openJobId: (job as any).id } });
        }}
      />
    </div>
  );
}

// ============= Dialog =============
type Draft = {
  client_id: string;
  contract_id: string;
  responsible_id: string;
  title: string;
  description: string;
  value: string;
  deadline_days: string;
  due_date: string;
};

const blankDraft = (clientId?: string): Draft => ({
  client_id: clientId ?? "",
  contract_id: "",
  responsible_id: "",
  title: "",
  description: "",
  value: "",
  deadline_days: "7",
  due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
});

function NewDmeDialog({ open, onOpenChange, defaultClientId }: { open: boolean; onOpenChange: (o: boolean) => void; defaultClientId?: string }) {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Draft[]>([blankDraft(defaultClientId)]);

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => fetchClients() });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

  function patch(i: number, p: Partial<Draft>) {
    setDrafts((d) => d.map((x, idx) => (idx === i ? { ...x, ...p } : x)));
  }
  function addRow() { setDrafts((d) => [...d, blankDraft(defaultClientId)]); }
  function removeRow(i: number) { setDrafts((d) => d.length > 1 ? d.filter((_, idx) => idx !== i) : d); }

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = drafts.map((d) => {
        if (!d.client_id) throw new Error("Selecione um cliente em todas as linhas.");
        if (!d.title.trim()) throw new Error("Informe o título de todas as DMEs.");
        const value = Number((d.value || "").toString().replace(",", "."));
        if (!value || value <= 0) throw new Error("Toda DME precisa ter valor > 0.");
        if (!d.due_date) throw new Error("Informe a data de vencimento.");
        return {
          client_id: d.client_id,
          contract_id: d.contract_id || null,
          responsible_id: d.responsible_id || null,
          title: d.title.trim(),
          description: d.description.trim() || null,
          value,
          deadline_days: d.deadline_days ? Number(d.deadline_days) : null,
          due_date: d.due_date,
          status: "pending",
        };
      });
      return createExtraDemandsBatch(payload as any);
    },
    onSuccess: (rows) => {
      qc.invalidateQueries({ queryKey: ["extra_demands"] });
      toast.success(`${rows.length} DME${rows.length > 1 ? "s criadas" : " criada"}. Copie o link e envie ao cliente.`);
      setDrafts([blankDraft(defaultClientId)]);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[920px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="size-5 text-primary" /> Nova(s) Demanda(s) Extra(s)</DialogTitle>
          <DialogDescription>Adicione uma ou várias DMEs de uma vez. Cada uma terá seu próprio link de aprovação.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {drafts.map((d, i) => (
            <DmeDraftRow
              key={i}
              index={i}
              total={drafts.length}
              draft={d}
              clients={clients}
              profiles={profiles}
              onPatch={(p) => patch(i, p)}
              onRemove={() => removeRow(i)}
            />
          ))}
          <Button variant="outline" onClick={addRow} className="w-full gap-2 border-dashed">
            <Plus className="size-4" /> Adicionar outra demanda
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="gap-2">
            {saveMut.isPending && <Loader2 className="size-4 animate-spin" />}
            Criar {drafts.length > 1 ? `${drafts.length} demandas` : "demanda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DmeDraftRow({
  index, total, draft, clients, profiles, onPatch, onRemove,
}: {
  index: number; total: number; draft: Draft;
  clients: any[]; profiles: any[];
  onPatch: (p: Partial<Draft>) => void; onRemove: () => void;
}) {
  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts", { clientId: draft.client_id }],
    queryFn: () => draft.client_id ? fetchContracts({ clientId: draft.client_id }) : Promise.resolve([]),
    enabled: !!draft.client_id,
  });

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 relative">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Item {index + 1} de {total}</span>
        {total > 1 && (
          <Button size="icon" variant="ghost" onClick={onRemove} className="size-7 text-red-500">
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Cliente *</Label>
          <Select value={draft.client_id} onValueChange={(v) => onPatch({ client_id: v, contract_id: "" })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {clients.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Contrato (opcional)</Label>
          <Select value={draft.contract_id || "none"} onValueChange={(v) => onPatch({ contract_id: v === "none" ? "" : v })} disabled={!draft.client_id}>
            <SelectTrigger><SelectValue placeholder={draft.client_id ? "Sem contrato" : "Escolha o cliente"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Avulsa (sem contrato)</SelectItem>
              {contracts.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Título *</Label>
        <Input value={draft.title} onChange={(e) => onPatch({ title: e.target.value })} placeholder="Ex: Campanha de Black Friday — 5 artes" />
      </div>

      <div>
        <Label className="text-xs">Descrição (escopo)</Label>
        <Textarea value={draft.description} onChange={(e) => onPatch({ description: e.target.value })} rows={2} placeholder="Detalhe o que será entregue..." />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Valor *</Label>
          <Input type="number" step="0.01" value={draft.value} onChange={(e) => onPatch({ value: e.target.value })} placeholder="0,00" />
        </div>
        <div>
          <Label className="text-xs">Prazo (dias)</Label>
          <Input type="number" value={draft.deadline_days} onChange={(e) => onPatch({ deadline_days: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Vencimento da cobrança *</Label>
          <Input type="date" value={draft.due_date} onChange={(e) => onPatch({ due_date: e.target.value })} />
        </div>
      </div>

      <div>
        <Label className="text-xs">Responsável interno</Label>
        <Select value={draft.responsible_id || "none"} onValueChange={(v) => onPatch({ responsible_id: v === "none" ? "" : v })}>
          <SelectTrigger><SelectValue placeholder="Quem cuida desta DME?" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem responsável</SelectItem>
            {profiles.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.display_name || p.full_name || "Sem nome"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
