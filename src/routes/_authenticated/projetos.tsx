import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, FolderKanban, MoreVertical, Eye, Pencil, Copy, Archive, Trash2, FileSignature, Users, Search, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { supabase } from "@/integrations/supabase/client";
import { fetchProjects, fetchClients, deleteProject, duplicateProject, archiveProject } from "@/lib/ops-api";
import { Button } from "@/components/ui/button";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";
import { ProjectDetailSheet } from "@/components/projects/ProjectDetailSheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projetos")({
  head: () => ({ meta: [{ title: "Projetos — KASA HUB" }] }),
  component: ProjetosPage,
});

function ProjetosPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    type: "all",
    clientId: "all",
    contractId: "all"
  });

  const { data: projects = [], isLoading } = useQuery({ 
    queryKey: ["projects", filters], 
    queryFn: () => fetchProjects(filters) 
  });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: allContracts = [] } = useQuery({
    queryKey: ["all-contracts"],
    queryFn: async () => {
      const { data } = await supabase.from("contracts").select("id, title, client_id");
      return data || [];
    }
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, display_name, avatar_url");
      return data || [];
    }
  });


  const { data: allJobs = [] } = useQuery({
    queryKey: ["all-jobs-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("id, project_id, done_at, stage_id");
      if (error) {
        console.error("Erro ao buscar jobs para estatísticas:", error);
        return [];
      }
      return data || [];
    },
    refetchOnWindowFocus: true,
  });

  const { data: stages = [] } = useQuery({ 
    queryKey: ["job-stages"], 
    queryFn: async () => {
      const { data } = await supabase.from("job_stages").select("id, is_done");
      return data || [];
    } 
  });

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const clientById = new Map(clients.map((c) => [c.id, c]));
  const doneStageIds = new Set(stages.filter(s => s.is_done).map(s => s.id));

  const editingProject = editingId ? (projects.find((p) => p.id === editingId) ?? null) as any : null;

  const delMut = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dupMut = useMutation({
    mutationFn: (id: string) => duplicateProject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto duplicado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) => archiveProject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto arquivado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 lg:px-10 pt-6 pb-4">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <div>
            <span className="text-primary text-[10px] capitalize font-bold tracking-widest">
              Operação · Projetos
            </span>
            <h1 className="font-display text-2xl lg:text-4xl font-bold tracking-tight mt-1">
              Projetos
            </h1>
          </div>
          <Button
            onClick={() => setOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold h-10 px-5 gap-2"
          >
            <Plus className="size-4" /> Projeto Especial
          </Button>
        </div>

        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground/30" />
              <Input
                placeholder="Pesquisar por projeto, cliente ou contrato..."
                className="pl-9 h-10 rounded-xl bg-surface border-border/40 focus:border-primary/50 transition-all"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            
            <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
              <SelectTrigger className="w-[180px] h-10 rounded-xl bg-surface border-border/40">
                <SelectValue placeholder="Tipo de Projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="automatic">Automáticos</SelectItem>
                <SelectItem value="special">Projetos Especiais</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.clientId} onValueChange={(v) => setFilters({ ...filters, clientId: v, contractId: "all" })}>
              <SelectTrigger className="w-[180px] h-10 rounded-xl bg-surface border-border/40">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Clientes</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filters.clientId !== "all" && (
              <Select value={filters.contractId} onValueChange={(v) => setFilters({ ...filters, contractId: v })}>
                <SelectTrigger className="w-[180px] h-10 rounded-xl bg-surface border-border/40">
                  <SelectValue placeholder="Contrato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Contratos</SelectItem>
                  {allContracts.filter(ct => ct.client_id === filters.clientId).map(ct => (
                    <SelectItem key={ct.id} value={ct.id}>{ct.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: "all", label: "Todos" },
              { id: "active", label: "Ativos" },
              { id: "completed", label: "Concluídos" },
              { id: "paused", label: "Pausados" },
              { id: "cancelled", label: "Cancelados" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setFilters({ ...filters, status: s.id })}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all",
                  filters.status === s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface text-foreground/40 hover:text-foreground border border-border/40"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 lg:px-10 pb-10">
        {projects.length === 0 ? (
          <div className="border border-dashed border-border/60 rounded-2xl p-12 text-center text-foreground/50">
            <FolderKanban className="size-8 mx-auto mb-3 text-foreground/30" />
            <p className="text-sm">Nenhum projeto criado ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 md:pb-0">
            {projects.map((p) => {
              const c = p.client_id ? clientById.get(p.client_id) : null;
              const ct = allContracts.find(x => x.id === p.contract_id);
              return (
                <div key={p.id} className="relative group">
                  <Link
                    to="/projetos/$projectId"
                    params={{ projectId: p.id }}
                    className="text-left w-full block bg-surface border border-border rounded-2xl p-5 hover:border-primary/50 transition"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 pr-8 flex-wrap">
                        <span className="size-2 rounded-full" style={{ background: p.color ?? "#FFBC45" }} />
                        <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-tighter h-5 px-1.5 bg-background/50 border-border/40">
                          {p.type === 'special' ? 'Especial' : 'Automático'}
                        </Badge>
                        <span className={cn(
                          "text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full",
                          p.status === 'active' ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                        )}>
                          {p.status === 'completed' ? 'Concluído' : p.status === 'cancelled' ? 'Cancelado' : p.status === 'active' ? 'Ativo' : p.status}
                        </span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            className="p-1.5 rounded-md text-foreground/40 hover:text-foreground hover:bg-surface-elevated transition opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={(e) => { e.preventDefault(); setEditingId(p.id); }} className="gap-2">
                            <Pencil className="size-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.preventDefault(); dupMut.mutate(p.id); }} className="gap-2">
                            <Copy className="size-4" /> Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.preventDefault(); archiveMut.mutate(p.id); }} className="gap-2">
                            <Archive className="size-4" /> Arquivar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault();
                              if (confirm(`Remover "${p.name}"? Esta ação não pode ser desfeita.`)) {
                                delMut.mutate(p.id);
                              }
                            }}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="font-display font-bold text-xl leading-tight group-hover:text-primary transition-colors">{p.name}</div>
                    
                    <div className="mt-4 space-y-2.5">
                      {c && (
                        <div className="flex items-center gap-2 text-xs text-foreground/60">
                          <div className="size-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
                            <Users className="size-3 text-primary" />
                          </div>
                          <span className="truncate font-medium">{c.company || c.name}</span>
                        </div>
                      )}
                      {ct && (
                        <div className="flex items-center gap-2 text-[10px] text-foreground/40 uppercase font-bold tracking-wider">
                          <div className="size-5 rounded bg-foreground/5 flex items-center justify-center shrink-0">
                            <FileSignature className="size-3" />
                          </div>
                          <span className="truncate">{ct.title}</span>
                        </div>
                      )}
                      {(() => {
                        const owner = users.find(u => u.id === (p as any).responsible_id || u.id === p.owner_id);
                        if (!owner) return null;
                        const ownerName = owner.display_name || owner.full_name || "Membro";
                        return (
                          <div className="flex items-center gap-2 text-[10px] text-foreground/40 uppercase font-bold tracking-wider">
                            <div className="size-5 rounded-full bg-foreground/5 overflow-hidden flex items-center justify-center shrink-0 border border-border/40">
                              {(owner as any).avatar_url ? (
                                <img src={(owner as any).avatar_url} alt="" className="size-full object-cover" />
                              ) : (
                                <span className="text-[8px]">{ownerName.split(' ').map((n: any) => n[0]).join('').slice(0, 2)}</span>
                              )}
                            </div>
                            <span className="truncate">Resp: {ownerName.split(' ')[0]}</span>
                          </div>
                        );
                      })()}
                    </div>


                    {(() => {
                      const pJobs = allJobs.filter(j => j.project_id === p.id);
                      const total = pJobs.length;
                      const done = pJobs.filter(j => !!j.done_at || (j.stage_id && doneStageIds.has(j.stage_id))).length;
                      const progress = total === 0 ? 0 : Math.round((done / total) * 100);
                      return (
                        <div className="mt-5 space-y-2">
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] text-foreground/40 font-mono-kasa">{total} {total === 1 ? "Job" : "Jobs"} · {done} {done === 1 ? "Concluído" : "Concluídos"}</span>
                            <span className="text-[10px] font-bold text-primary font-mono-kasa">{progress}%</span>
                          </div>
                          <div className="h-1.5 bg-background rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      );
                    })()}
                  </Link>
                </div>

              );
            })}
          </div>
        )}
      </div>

      <NewProjectDialog open={open} onOpenChange={setOpen} />
      <ProjectDetailSheet
        projectId={selectedId}
        open={selectedId !== null}
        onOpenChange={(v) => { if (!v) setSelectedId(null); }}
      />
      {editingProject && (
        <EditProjectDialog
          project={editingProject}
          open={editingId !== null}
          onOpenChange={(v) => { if (!v) setEditingId(null); }}
        />
      )}
    </div>
  );
}
