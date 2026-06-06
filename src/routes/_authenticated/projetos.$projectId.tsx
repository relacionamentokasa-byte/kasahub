import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Pencil, FileSignature, CheckCircle2, Clock, AlertCircle, LayoutDashboard, Kanban, FileText, History, DollarSign, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchProject, fetchClient, fetchJobs, fetchJobStages, fetchProjectStats } from "@/lib/ops-api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { JobsBoard } from "@/components/jobs/JobsBoard";
import { Button } from "@/components/ui/button";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";
import { ExtraDemandsManager } from "@/components/contracts/ExtraDemandsManager";
import { ProjectFinanceView } from "@/components/projects/ProjectFinanceView";
import { ClientTimeline } from "@/components/clients/ClientTimeline";


export const Route = createFileRoute("/_authenticated/projetos/$projectId")({
  head: () => ({ meta: [{ title: "Projeto — KASA OS" }] }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { projectId } = useParams({ from: "/_authenticated/projetos/$projectId" });
  return <ProjectDetailContent projectId={projectId} />;
}

export function ProjectDetailContent({ projectId, embedded = false }: { projectId: string; embedded?: boolean }) {
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
  const { data: contract } = useQuery({
    queryKey: ["contract", project?.contract_id],
    queryFn: async () => {
      const { data } = await supabase.from("contracts").select("*").eq("id", project!.contract_id!).single();
      return data;
    },
    enabled: !!project?.contract_id,
  });
  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs", { projectId }],
    queryFn: () => fetchJobs({ projectId }),
  });
  const { data: stages = [] } = useQuery({ queryKey: ["job-stages"], queryFn: fetchJobStages });
  const { data: stats } = useQuery({
    queryKey: ["project-stats", projectId],
    queryFn: () => fetchProjectStats(projectId),
    enabled: !!project,
  });

  if (!project) return <div className="p-10 text-foreground/40">Carregando…</div>;

  return (
    <div className="flex flex-col h-full bg-background/50">
      {/* Header */}
      <div className="px-6 lg:px-10 pt-6 pb-6 bg-surface border-b border-border">
        {!embedded && (
          <Link
            to="/projetos"
            className="inline-flex items-center gap-1.5 text-[10px] text-foreground/40 hover:text-primary mb-4 uppercase font-bold tracking-widest transition-colors"
          >
            <ArrowLeft className="size-3" /> Voltar para Projetos
          </Link>
        )}
        
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-start gap-5 min-w-0 flex-1">
            <div 
              className="size-14 rounded-2xl shrink-0 flex items-center justify-center border border-border shadow-sm" 
              style={{ background: `${project.color ?? "#FFBC45"}15`, color: project.color ?? "#FFBC45" }}
            >
              <LayoutDashboard className="size-7" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-primary text-[10px] uppercase font-bold tracking-widest">
                  Projeto · Operação
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  project.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground'
                }`}>
                  {project.status === 'active' ? 'Ativo' : project.status}
                </span>
              </div>
              <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight truncate">{project.name}</h1>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-[11px] text-foreground/50">
                {client && (
                  <Link to="/clientes/$clientId" params={{ clientId: client.id }} className="hover:text-primary flex items-center gap-1.5 transition-colors font-medium">
                    <CheckCircle2 className="size-3 text-primary" /> {client.company || client.name}
                  </Link>
                )}
                {contract && (
                  <span className="inline-flex items-center gap-1.5 text-foreground/60 font-medium border-l border-border pl-5">
                    <FileSignature className="size-3" /> {contract.title}
                  </span>
                )}
                {project.due_date && (
                  <span className="inline-flex items-center gap-1.5 border-l border-border pl-5 font-mono-kasa">
                    <Calendar className="size-3" /> {new Date(project.due_date).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="h-9 px-4 rounded-full border-border hover:bg-foreground/5 font-semibold text-xs gap-2">
              <Pencil className="size-3.5" /> Editar Projeto
            </Button>
          </div>
        </div>

        {/* KPI Bar */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-8">
          <StatMini label="Total de Jobs" value={stats?.total ?? 0} icon={<Kanban className="size-3" />} />
          <StatMini label="Concluídos" value={stats?.done ?? 0} icon={<CheckCircle2 className="size-3" />} color="text-emerald-400" />
          <StatMini label="Pendentes" value={stats?.pending ?? 0} icon={<Clock className="size-3" />} color="text-amber-400" />
          <StatMini label="Atrasados" value={stats?.overdue ?? 0} icon={<AlertCircle className="size-3" />} color="text-rose-400" />
          <StatMini label="DMEs" value={stats?.dmeCount ?? 0} icon={<DollarSign className="size-3" />} />
          <div className="bg-foreground/[0.03] border border-border/50 rounded-xl p-3 flex flex-col justify-between min-h-[70px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-foreground/40 tracking-wider">Progresso</span>
              <span className="text-xs font-bold text-primary">{stats?.progress ?? 0}%</span>
            </div>
            <div className="h-1.5 bg-background rounded-full overflow-hidden mt-2">
              <div className="h-full bg-primary transition-all duration-700" style={{ width: `${stats?.progress ?? 0}%` }} />
            </div>
          </div>
        </div>
      </div>


      <Tabs defaultValue="board" className="flex-1 flex flex-col">
        <div className="px-6 lg:px-10 border-b border-border">
          <TabsList className="bg-transparent border-0 h-auto p-0 gap-1">
            {["board", "briefing", "team"].map((v) => (
              <TabsTrigger
                key={v}
                value={v}
                className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-3 py-2.5 text-xs capitalize"
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

      <EditProjectDialog project={project} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
