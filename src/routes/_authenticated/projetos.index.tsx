import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, FolderKanban, MoreVertical, Pencil, Trash2, Search, CheckSquare, Building2, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { fetchProjects, fetchClients, deleteProject } from "@/lib/ops-api";
import { Button } from "@/components/ui/button";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/projetos/")({
  head: () => ({ meta: [{ title: "Projetos — KASA HUB" }] }),
  component: ProjetosPage,
});

function formatDateBR(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getDateAlertColor(dateStr: string | null | undefined): { text: string; label: string } | null {
  if (!dateStr) return null;
  const end = new Date(dateStr + "T00:00:00");
  if (isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: "text-red-500", label: `Vencido há ${Math.abs(diffDays)} dias` };
  if (diffDays <= 30) return { text: "text-amber-500", label: `Vence em ${diffDays} dias` };
  return { text: "text-muted-foreground", label: `Válido até ${formatDateBR(dateStr)}` };
}

function ProjetosPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);

  const { data: projects = [], isLoading } = useQuery({ 
    queryKey: ["projects"], 
    queryFn: () => fetchProjects() 
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const confirmDelete = window.confirm(
        "Tem certeza? Isso apagará também todos os jobs, eventos de calendário e financeiro vinculados a este projeto."
      );
      if (!confirmDelete) throw new Error("Ação cancelada pelo usuário");
      
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto removido com sucesso!");
    },
    onError: (e: any) => {
      if (e.message !== "Ação cancelada pelo usuário") {
        toast.error(`Erro ao excluir: ${e.message}`);
      }
    },
  });

  const filtered = projects.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 lg:px-10 pt-6 pb-4">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h1 className="font-display text-2xl lg:text-4xl font-bold tracking-tight">Projetos</h1>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="size-4" /> Novo Projeto
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground/30" />
          <Input
            placeholder="Pesquisar projetos..."
            className="pl-9 bg-surface"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 lg:px-10 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="bg-surface border border-border rounded-2xl p-5 group">
              <div className="flex justify-between items-start mb-4">
                <div className="size-10 rounded-xl flex items-center justify-center border border-border" style={{ color: p.color || "#FFBC45" }}>
                  <FolderKanban className="size-5" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreVertical className="size-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => { setEditingProject(p); }}>Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => delMut.mutate(p.id)} className="text-rose-500">Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Link to="/projetos/$projectId" params={{ projectId: p.id }} className="block font-bold text-lg hover:text-primary transition-colors">
                {p.name}
              </Link>
              {(() => {
                const clientRel: any = p.clients;
                const client = Array.isArray(clientRel) ? clientRel[0] : clientRel;
                const clientName = client?.name || client?.company || null;
                const contractRel: any = p.contracts;
                const contract = Array.isArray(contractRel) ? contractRel[0] : contractRel;
                const dateAlert = getDateAlertColor(contract?.end_date);
                return (
                  <div className="mt-2 space-y-1">
                    {clientName && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Building2 className="size-3.5 shrink-0" />
                        <span className="truncate">{clientName}</span>
                      </div>
                    )}
                    {dateAlert && (
                      <div className={`flex items-center gap-1.5 text-sm ${dateAlert.text}`}>
                        <Calendar className="size-3.5 shrink-0" />
                        <span>{dateAlert.label}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 text-[10px] font-bold uppercase tracking-tighter gap-1">
                  <CheckSquare className="size-3" />
                  {p.total_jobs || 0} Jobs Vinculados
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <NewProjectDialog open={open} onOpenChange={setOpen} />
      {editingProject && (
        <EditProjectDialog
          project={editingProject}
          open={!!editingProject}
          onOpenChange={(v) => { if (!v) setEditingProject(null); }}
        />
      )}
    </div>
  );
}
