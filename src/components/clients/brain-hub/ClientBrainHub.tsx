import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  Search,
  Plus,
  LayoutGrid,
  ListFilter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderKanban,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { fetchJobs, fetchProjects, type Job, type Project } from "@/lib/ops-api";
import { fetchContracts } from "@/lib/finance-api";
import { buildFrontClusters } from "./brain-classifier";
import { BrainDrawerCard } from "./BrainDrawerCard";
import { JobSheet } from "@/components/jobs/JobSheet";
import { NewJobDialog } from "@/components/jobs/NewJobDialog";
import { JobsBoard } from "@/components/jobs/JobsBoard";
import { MonthlyDeliverablesDialog } from "@/components/contracts/MonthlyDeliverablesDialog";

interface Props {
  clientId: string;
  clientName: string;
  clientCompany?: string | null;
  clientLogoUrl?: string | null;
}

export function ClientBrainHub({ clientId, clientName, clientCompany, clientLogoUrl }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"drawers" | "kanban">("drawers");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isNewJobOpen, setIsNewJobOpen] = useState(false);
  const [newJobProjectId, setNewJobProjectId] = useState<string | undefined>(undefined);
  const [isDeliverablesReportOpen, setIsDeliverablesReportOpen] = useState(false);

  // 1. Carregar Projetos do Cliente
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["client-projects", clientId],
    queryFn: () => fetchProjects({ clientId }),
    enabled: !!clientId,
  });

  // 2. Carregar Jobs do Cliente
  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ["jobs", { clientId }],
    queryFn: () => fetchJobs({ clientId }),
    enabled: !!clientId,
  });

  // 2.1 Carregar Estágios de Jobs
  const { data: stages = [] } = useQuery({
    queryKey: ["job-stages"],
    queryFn: async () => {
      const { data } = await supabase.from("job_stages").select("*").order("order_index", { ascending: true });
      return data || [];
    },
  });

  // 3. Carregar Contratos do Cliente (para cálculo de franquia e escopo)
  const { data: contracts = [] } = useQuery({
    queryKey: ["client-contracts", clientId],
    queryFn: () => fetchContracts({ clientId }),
    enabled: !!clientId,
  });

  // 3. Filtrar e Agrupar nas Gavetas Temáticas
  const filteredJobs = useMemo(() => {
    if (!searchTerm.trim()) return jobs;
    const term = searchTerm.toLowerCase();
    return jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(term) ||
        (j as any).services?.name?.toLowerCase().includes(term) ||
        (j as any).projects?.name?.toLowerCase().includes(term)
    );
  }, [jobs, searchTerm]);

  const clusters = useMemo(() => {
    return buildFrontClusters(projects, filteredJobs);
  }, [projects, filteredJobs]);

  // Estatísticas Globais do Cliente
  const globalStats = useMemo(() => {
    let total = jobs.length;
    let completed = jobs.filter((j) => j.status === "done" || (j as any).job_stages?.is_done).length;
    let inProgress = jobs.filter((j) => j.status === "in_progress").length;
    let review = jobs.filter((j) => j.status === "review").length;
    const todayStr = new Date().toISOString().split("T")[0];
    let overdue = jobs.filter(
      (j) => j.status !== "done" && !(j as any).job_stages?.is_done && j.due_date && j.due_date < todayStr
    ).length;

    let activeFrontsCount = clusters.filter((c) => c.stats.total > 0 || c.projects.length > 0).length;
    let progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      inProgress,
      review,
      overdue,
      activeFrontsCount,
      progressPercentage,
    };
  }, [jobs, clusters]);

  const handleOpenNewJob = (frontId: string, projectId?: string) => {
    setNewJobProjectId(projectId);
    setIsNewJobOpen(true);
  };

  const isLoading = loadingProjects || loadingJobs;

  return (
    <div className="space-y-6">
      {/* Barra de Visão e Controles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-card shadow-xs">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Layers className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-bold text-foreground">
                Hub Cerebral de Entregas
              </h2>
              <Badge variant="outline" className="text-[10px] font-mono-kasa uppercase bg-muted/20">
                {globalStats.activeFrontsCount} frentes ativas
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Estrutura mental por frentes de atuação com visão executiva e detalhamento de jobs
            </p>
          </div>
        </div>

        {/* Alternador de Visão & Ação Rápida */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/10">
            <Button
              type="button"
              variant={viewMode === "drawers" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("drawers")}
              className="h-7 px-2.5 text-xs font-mono-kasa gap-1.5"
            >
              <LayoutGrid className="size-3.5" />
              Gavetas
            </Button>
            <Button
              type="button"
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              className="h-7 px-2.5 text-xs font-mono-kasa gap-1.5"
            >
              <ListFilter className="size-3.5" />
              Kanban
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDeliverablesReportOpen(true)}
            className="h-8 px-3 text-xs font-mono-kasa gap-1.5 border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
          >
            <Sparkles className="size-3.5 text-amber-500" />
            <span className="hidden sm:inline">Prestação de Contas</span> (PDF)
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleOpenNewJob("general")}
            className="h-8 px-3 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground"
          >
            <Plus className="size-3.5" />
            Novo Job
          </Button>
        </div>
      </div>

      {viewMode === "drawers" ? (
        <>
          {/* Card Resumo de Saúde das Frentes */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg border border-border/60 bg-card">
              <span className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground block">
                Taxa Geral de Conclusão
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono-kasa text-xl font-bold text-foreground">
                  {globalStats.progressPercentage}%
                </span>
                <span className="text-[11px] font-mono-kasa text-muted-foreground">
                  ({globalStats.completed}/{globalStats.total} jobs)
                </span>
              </div>
              <Progress value={globalStats.progressPercentage} className="h-1.5 mt-2" />
            </div>

            <div className="p-3.5 rounded-lg border border-border/60 bg-card">
              <span className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground block">
                Em Andamento
              </span>
              <div className="font-mono-kasa text-xl font-bold text-blue-500 mt-1">
                {globalStats.inProgress}
              </div>
              <span className="text-[10px] font-mono-kasa text-muted-foreground block mt-1">
                {globalStats.review} aguardando revisão
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-border/60 bg-card">
              <span className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground block">
                Atrasados / Atenção
              </span>
              <div
                className={cn(
                  "font-mono-kasa text-xl font-bold mt-1",
                  globalStats.overdue > 0 ? "text-red-500" : "text-foreground"
                )}
              >
                {globalStats.overdue}
              </div>
              <span className="text-[10px] font-mono-kasa text-muted-foreground block mt-1">
                {globalStats.overdue > 0 ? "Exigem intervenção imediata" : "Nenhum prazo estourado"}
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-border/60 bg-card">
              <span className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground block">
                Total de Projetos
              </span>
              <div className="font-mono-kasa text-xl font-bold text-foreground mt-1">
                {projects.length}
              </div>
              <span className="text-[10px] font-mono-kasa text-muted-foreground block mt-1">
                distribuídos nas macro-frentes
              </span>
            </div>
          </div>

          {/* Busca Rápida de Entregas */}
          <div className="relative max-w-md">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar entregas, projetos ou serviços..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9 bg-card border-border/60"
            />
          </div>

          {/* As Gavetas Temáticas da Conta */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-muted/20 animate-pulse border border-border/40" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {clusters
                // Ordenar: primeiro as gavetas com jobs/projetos, depois as vazias
                .sort((a, b) => {
                  const aActive = a.stats.total > 0 || a.projects.length > 0;
                  const bActive = b.stats.total > 0 || b.projects.length > 0;
                  if (aActive !== bActive) return aActive ? -1 : 1;
                  return 0;
                })
                .map((cluster, index) => (
                  <BrainDrawerCard
                    key={cluster.config.id}
                    cluster={cluster}
                    defaultOpen={index === 0 && (cluster.stats.total > 0 || cluster.projects.length > 0)}
                    onOpenJob={(id) => setSelectedJobId(id)}
                    onNewJob={(frontId, projId) => handleOpenNewJob(frontId, projId)}
                  />
                ))}
            </div>
          )}
        </>
      ) : (
        /* Visão Alternativa: Kanban Geral */
        <div className="border border-border/60 rounded-xl overflow-hidden bg-card p-4">
          <JobsBoard
            clientId={clientId}
            title={`Jobs de ${clientName}`}
            eyebrow="Operação Geral"
            showPeriodFilter
          />
        </div>
      )}

      {/* Drawer de Detalhamento do Job */}
      <JobSheet
        job={jobs.find((j) => j.id === selectedJobId) || null}
        stages={stages as any}
        onClose={() => setSelectedJobId(null)}
      />

      {/* Diálogo de Criação de Novo Job */}
      <NewJobDialog
        stage={stages[0] || null}
        open={isNewJobOpen}
        onOpenChange={setIsNewJobOpen}
        defaultClientId={clientId}
        defaultProjectId={newJobProjectId}
        onCreated={() => setIsNewJobOpen(false)}
      />

      {/* Dossiê Executivo de Prestação de Contas (PDF) */}
      <MonthlyDeliverablesDialog
        open={isDeliverablesReportOpen}
        onOpenChange={setIsDeliverablesReportOpen}
        clientId={clientId}
        clientName={clientName}
        clientCompany={clientCompany}
        clientLogoUrl={clientLogoUrl}
        contract={contracts.find((c) => c.status === "active") || contracts[0]}
      />
    </div>
  );
}
