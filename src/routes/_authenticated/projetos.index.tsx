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
        .select("*, clients(name, company, logo_url)")
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 w-full mx-auto animate-reveal">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <span className="text-[10px] uppercase font-mono-kasa tracking-wider text-muted-foreground block font-medium">
            Operação · Execução
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight mt-0.5">
            Projetos
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Organização e acompanhamento dos projetos ativos da agência.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-foreground text-background hover:bg-foreground/90 rounded-md font-medium h-8 px-3 text-xs gap-1.5 font-mono-kasa shadow-xs self-start sm:self-auto"
        >
          <Plus className="size-3.5 shrink-0" /> Novo Projeto
        </Button>
      </header>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por projeto ou cliente..."
            className="pl-8 bg-card border-border/60 rounded-md h-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="pt-2">
        {isLoading ? (
          <div className="rounded-lg border border-border/60 bg-card p-8 text-center text-muted-foreground text-xs italic">
            Carregando projetos...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-border/60 bg-card p-8 text-center text-muted-foreground text-xs italic">
            {search ? "Nenhum projeto encontrado para esta busca." : "Nenhum projeto cadastrado."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((p) => {
              const clientName = p.clients?.company || p.clients?.name || null;
              return (
                <div
                  key={p.id}
                  className="bg-card border border-border/60 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between hover:border-border transition-colors group shadow-xs active:scale-[0.99]"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="size-7 rounded-lg flex items-center justify-center border border-border/60 shrink-0"
                          style={{
                            background: `${p.color || "#FFBC45"}15`,
                            color: p.color || "#FFBC45",
                          }}
                        >
                          <FolderKanban className="size-3.5" />
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono-kasa uppercase tracking-wider font-semibold border border-border/60 text-muted-foreground bg-muted/20">
                          {p.status === "active" ? "Ativo" : p.status === "paused" ? "Pausado" : p.status === "completed" ? "Concluído" : p.status}
                        </span>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground">
                            <MoreVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 text-xs font-mono-kasa">
                          <DropdownMenuItem onClick={() => setEditingProject(p)} className="flex items-center gap-2 cursor-pointer text-xs">
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(p.id)}
                            className="flex items-center gap-2 cursor-pointer text-destructive text-xs"
                          >
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <Link
                      to="/projetos/$projectId"
                      params={{ projectId: p.id }}
                      className="block font-semibold text-sm text-foreground hover:underline transition-all line-clamp-1 mt-1"
                    >
                      {p.name}
                    </Link>

                    {clientName && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground font-mono-kasa">
                        {p.clients?.logo_url ? (
                          <img
                            src={p.clients.logo_url}
                            alt={clientName}
                            className="size-3.5 rounded object-cover shrink-0"
                          />
                        ) : (
                          <Building2 className="size-3 shrink-0 opacity-60" />
                        )}
                        <span className="truncate text-[11px]">{clientName}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/60">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono-kasa tabular-nums text-muted-foreground">
                      <CheckSquare className="size-3 text-muted-foreground/70" />
                      <span>{p.total_jobs || 0} jobs</span>
                    </span>

                    <Button asChild variant="ghost" size="sm" className="h-7 px-2.5 text-[11px] font-mono-kasa rounded-md text-muted-foreground hover:text-foreground">
                      <Link to="/projetos/$projectId" params={{ projectId: p.id }}>
                        Acessar →
                      </Link>
                    </Button>
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
