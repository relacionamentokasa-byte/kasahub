import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Pencil } from "lucide-react";
import { fetchProject, fetchClient, fetchJobs, fetchJobStages } from "@/lib/ops-api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { JobsBoard } from "@/components/jobs/JobsBoard";
import { Button } from "@/components/ui/button";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";

export const Route = createFileRoute("/_authenticated/projetos/$projectId")({
  head: () => ({ meta: [{ title: "Projeto — KASA OS" }] }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { projectId } = useParams({ from: "/_authenticated/projetos/$projectId" });
  const [editOpen, setEditOpen] = useState(false);
  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject(projectId),
  });
  const { data: client } = useQuery({
    queryKey: ["client", project?.client_id],
    queryFn: () => fetchClient(project!.client_id!),
    enabled: !!project?.client_id,
  });
  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs", { projectId }],
    queryFn: () => fetchJobs({ projectId }),
  });
  const { data: stages = [] } = useQuery({ queryKey: ["job-stages"], queryFn: fetchJobStages });

  if (!project) return <div className="p-10 text-foreground/40">Carregando…</div>;

  const stageById = new Map(stages.map((s) => [s.id, s]));
  const done = jobs.filter((j) => {
    const s = j.stage_id ? stageById.get(j.stage_id) : undefined;
    return s?.is_done || !!j.done_at;
  }).length;
  const progress = jobs.length === 0 ? 0 : Math.round((done / jobs.length) * 100);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 lg:px-10 pt-6 pb-4">
        <Link
          to="/projetos"
          className="inline-flex items-center gap-1.5 text-xs text-foreground/50 hover:text-primary mb-4 font-mono uppercase tracking-wider"
        >
          <ArrowLeft className="size-3.5" /> Projetos
        </Link>
        <span className="text-primary text-[10px] font-mono uppercase tracking-[0.25em]">
          Projeto · Operação
        </span>
        <div className="flex items-start gap-4">
          {project.cover_url ? (
            <img src={project.cover_url} alt="" className="size-16 rounded-2xl object-cover shrink-0 border border-border" />
          ) : (
            <div className="size-16 rounded-2xl shrink-0" style={{ background: `${project.color ?? "#FFBC45"}22` }} />
          )}
          <div className="flex-1 min-w-0">
            <span className="text-primary text-[10px] font-mono uppercase tracking-[0.25em]">
              Projeto · Operação
            </span>
            <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">{project.name}</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="shrink-0">
            <Pencil className="size-4 mr-1.5" /> Editar
          </Button>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-foreground/50">
            <Link to="/clientes/$clientId" params={{ clientId: client.id }} className="hover:text-primary">
              {client.company || client.name}
            </Link>
          )}
          {project.due_date && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3" /> Prazo {project.due_date}
            </span>
          )}
          <span className="font-mono uppercase tracking-wider">{progress}% concluído</span>
        </div>
        <div className="mt-3 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <Tabs defaultValue="board" className="flex-1 flex flex-col">
        <div className="px-6 lg:px-10 border-b border-border">
          <TabsList className="bg-transparent border-0 h-auto p-0 gap-1">
            {["board", "briefing", "team"].map((v) => (
              <TabsTrigger
                key={v}
                value={v}
                className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-3 py-2.5 text-xs uppercase font-mono tracking-wider"
              >
                {{ board: "Kanban", briefing: "Briefing", team: "Equipe" }[v]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="board" className="flex-1 mt-0 min-h-0">
          <JobsBoard projectId={projectId} title="Jobs do projeto" eyebrow="Projeto · Kanban" />
        </TabsContent>
        <TabsContent value="briefing" className="px-6 lg:px-10 py-6 mt-0">
          {project.briefing ? (
            <p className="text-sm whitespace-pre-wrap">{project.briefing}</p>
          ) : (
            <p className="text-foreground/40 text-sm">Nenhum briefing adicionado.</p>
          )}
        </TabsContent>
        <TabsContent value="team" className="px-6 lg:px-10 py-6 mt-0 text-foreground/40 text-sm">
          Em breve.
        </TabsContent>
      </Tabs>
    </div>
  );
}
