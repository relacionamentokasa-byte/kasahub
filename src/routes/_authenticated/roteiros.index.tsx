import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchClients, fetchJobs } from "@/lib/ops-api";
import {
  listScripts, createScript, deleteScript,
  SCRIPT_CONTENT_LABEL, SCRIPT_STATUS_LABEL, SCRIPT_STATUS_COLOR,
  type ScriptContentType, type ScriptPlatform, type ScriptStatus,
} from "@/lib/scripts-api";
import { SOCIAL_LABEL } from "@/lib/editorial-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/roteiros/")({
  head: () => ({ meta: [{ title: "Roteiros — KASA HUB" }] }),
  component: RoteirosListPage,
});

function NewScriptDialog() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [form, setForm] = useState<{ job_id: string; title: string; content_type: ScriptContentType; platform: ScriptPlatform }>({
    job_id: "", title: "", content_type: "reels", platform: "instagram",
  });

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs-by-client", clientId],
    queryFn: () => fetchJobs({ clientId }),
    enabled: !!clientId,
  });

  const create = useMutation({
    mutationFn: () => createScript(form),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ["scripts"] });
      setOpen(false);
      navigate({ to: "/roteiros/$scriptId", params: { scriptId: s.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="size-4 mr-1" /> Novo roteiro</Button>
      </DialogTrigger>
      <DialogContent className="bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Novo roteiro</DialogTitle>
          <DialogDescription>Vincule a um Job existente — o cliente é herdado automaticamente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={(v) => { setClientId(v); setForm(f => ({ ...f, job_id: "" })); }}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{(c as any).company || c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Job</Label>
            <Select value={form.job_id} onValueChange={(v) => setForm(f => ({ ...f, job_id: v }))} disabled={!clientId}>
              <SelectTrigger className="bg-background"><SelectValue placeholder={clientId ? "Selecione" : "Escolha o cliente primeiro"} /></SelectTrigger>
              <SelectContent>
                {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Título do roteiro</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-background" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.content_type} onValueChange={(v) => setForm(f => ({ ...f, content_type: v as ScriptContentType }))}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SCRIPT_CONTENT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <Select value={form.platform} onValueChange={(v) => setForm(f => ({ ...f, platform: v as ScriptPlatform }))}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SOCIAL_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => create.mutate()} disabled={!form.job_id || !form.title || create.isPending}>
            Criar roteiro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoteirosListPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<{ status?: ScriptStatus; ct?: ScriptContentType; clientId?: string }>({});
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: scripts = [] } = useQuery({
    queryKey: ["scripts", filters],
    queryFn: () => listScripts({ status: filters.status, contentType: filters.ct, clientId: filters.clientId }),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteScript(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scripts"] }),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono-kasa text-foreground/40 uppercase">Operação · Conteúdo</p>
          <h1 className="font-display text-3xl mt-1">Roteiros</h1>
          <p className="text-foreground/60 text-sm mt-1">Roteiros para vídeos e eventos vinculados aos Jobs.</p>
        </div>
        <NewScriptDialog />
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filters.clientId ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, clientId: v === "all" ? undefined : v }))}>
          <SelectTrigger className="bg-background w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos clientes</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{(c as any).company || c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.ct ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, ct: v === "all" ? undefined : v as ScriptContentType }))}>
          <SelectTrigger className="bg-background w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {Object.entries(SCRIPT_CONTENT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.status ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, status: v === "all" ? undefined : v as ScriptStatus }))}>
          <SelectTrigger className="bg-background w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(SCRIPT_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {scripts.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-16 text-center text-foreground/50">
          Nenhum roteiro encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scripts.map((s: any) => (
            <Card key={s.id} className="bg-surface border-border p-4 hover:border-primary/40 transition-colors">
              <Link to="/roteiros/$scriptId" params={{ scriptId: s.id }} className="block space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-snug">{s.title}</h3>
                  <Badge variant="outline" className={cn("text-[9px] shrink-0", SCRIPT_STATUS_COLOR[s.status as ScriptStatus])}>
                    {SCRIPT_STATUS_LABEL[s.status as ScriptStatus]}
                  </Badge>
                </div>
                <p className="text-xs text-foreground/50">
                  {s.clients?.name ?? "—"} · {s.jobs?.title ?? "—"}
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[9px]">{SCRIPT_CONTENT_LABEL[s.content_type as ScriptContentType]}</Badge>
                  <Badge variant="outline" className="text-[9px]">{SOCIAL_LABEL[s.platform as keyof typeof SOCIAL_LABEL]}</Badge>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive mt-2 h-7 text-xs"
                onClick={() => { if (confirm("Excluir roteiro?")) del.mutate(s.id); }}
              >
                <Trash2 className="size-3 mr-1" /> Excluir
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
