import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, FolderKanban, MoreVertical, Eye, Pencil, Copy, Archive, Trash2 } from "lucide-react";
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
  head: () => ({ meta: [{ title: "Projetos — KASA OS" }] }),
  component: ProjetosPage,
});

function ProjetosPage() {
  const qc = useQueryClient();
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const clientById = new Map(clients.map((c) => [c.id, c]));
  const editingProject = editingId ? projects.find((p) => p.id === editingId) ?? null : null;

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
      <div className="px-6 lg:px-10 pt-6 pb-4 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <span className="text-primary text-[10px] capitalize">
            Operação · Projetos
          </span>
          <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight mt-1">
            Projetos
          </h1>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold h-10 px-5 gap-2"
        >
          <Plus className="size-4" /> Novo projeto
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 lg:px-10 pb-10">
        {projects.length === 0 ? (
          <div className="border border-dashed border-border/60 rounded-2xl p-12 text-center text-foreground/50">
            <FolderKanban className="size-8 mx-auto mb-3 text-foreground/30" />
            <p className="text-sm">Nenhum projeto criado ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => {
              const c = p.client_id ? clientById.get(p.client_id) : null;
              return (
                <div key={p.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className="text-left w-full block bg-surface border border-border rounded-2xl p-5 hover:border-primary/50 transition"
                  >
                    {p.cover_url && (
                      <img src={p.cover_url} alt="" className="w-full h-24 rounded-lg object-cover mb-3" />
                    )}
                    <div className="flex items-center gap-2 mb-2 pr-8">
                      <span className="size-2 rounded-full" style={{ background: p.color ?? "#FFBC45" }} />
                      <span className="text-[10px] capitalize text-foreground/40">
                        {p.status}
                      </span>
                    </div>
                    <div className="font-display font-semibold text-lg leading-tight">{p.name}</div>
                    {c && (
                      <div className="text-xs text-foreground/50 mt-1">{c.company || c.name}</div>
                    )}
                    {p.due_date && (
                      <div className="text-[10px] text-foreground/40 mt-3 capitalize">
                        Prazo · {p.due_date}
                      </div>
                    )}
                  </button>
                  <div className="absolute top-3 right-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="p-2 rounded-md text-foreground/60 hover:text-foreground hover:bg-surface-elevated transition"
                          aria-label="Ações"
                        >
                          <MoreVertical className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setSelectedId(p.id)} className="gap-2">
                          <Eye className="size-4" /> Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingId(p.id)} className="gap-2">
                          <Pencil className="size-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => dupMut.mutate(p.id)} className="gap-2">
                          <Copy className="size-4" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => archiveMut.mutate(p.id)} className="gap-2">
                          <Archive className="size-4" /> Arquivar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
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
