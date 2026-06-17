import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, FolderKanban, MoreVertical, Search, CheckSquare, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/projetos/")({
  head: () => ({ meta: [{ title: "Projetos — KASA HUB" }] }),
  component: ProjetosPage,
});

type ProjectRow = {
  id: string;
  name: string;
  status: string;
  color: string | null;
  total_jobs: number;
  client_id: string;
  clients: { name: string | null; company: string | null; logo_url: string | null } | null;
  [key: string]: unknown;
};

/**
 * Aba de Projetos — reconstruída do zero (clean code).
 * - UM único useQuery busca os projetos; os cards renderizam direto do `data`.
 * - SEM useState/useEffect para armazenar a lista (zero risco de loop #185).
 */
function ProjetosPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectRow | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(name, company)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProjectRow[];
    },
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto removido com sucesso!");
    },
    onError: (e: Error) => toast.error(`Erro ao excluir: ${e.message}`),
  });

  const handleDelete = (id: string) => {
    const confirmDelete = window.confirm(
      "Tem certeza? Isso apagará também todos os jobs vinculados a este projeto.",
    );
    if (confirmDelete) delMut.mutate(id);
  };

  // Filtro derivado diretamente do data — sem estado redundante
  const filtered = projects.filter((p) =>
    (p.name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 lg:px-10 pt-6 pb-4">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h1 className="font-display text-2xl lg:text-4xl font-bold tracking-tight">Projetos</h1>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
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
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando projetos...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum projeto encontrado.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const clientName = p.clients?.company || p.clients?.name || null;
              return (
                <div key={p.id} className="bg-surface border border-border rounded-2xl p-5 group">
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className="size-10 rounded-xl flex items-center justify-center border border-border"
                      style={{ color: p.color || "#FFBC45" }}
                    >
                      <FolderKanban className="size-5" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setEditingProject(p)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(p.id)}
                          className="text-rose-500"
                        >
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Link
                    to="/projetos/$projectId"
                    params={{ projectId: p.id }}
                    className="block font-bold text-lg hover:text-primary transition-colors"
                  >
                    {p.name}
                  </Link>

                  {clientName && (
                    <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Building2 className="size-3.5 shrink-0" />
                      <span className="truncate">{clientName}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                    <Badge
                      variant="secondary"
                      className="bg-primary/5 text-primary border-primary/10 text-[10px] font-bold uppercase tracking-tighter gap-1"
                    >
                      <CheckSquare className="size-3" />
                      {p.total_jobs || 0} Jobs Vinculados
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <NewProjectDialog open={isModalOpen} onOpenChange={setIsModalOpen} />
      {editingProject && (
        <EditProjectDialog
          project={editingProject as never}
          open={!!editingProject}
          onOpenChange={(v) => {
            if (!v) setEditingProject(null);
          }}
        />
      )}
    </div>
  );
}
