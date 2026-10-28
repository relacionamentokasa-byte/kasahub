import { useState } from "react";
import {
  ChevronDown,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { priorityColor, priorityLabel, type Job } from "@/lib/ops-api";
import type { FrontClusterData } from "./types";

interface Props {
  cluster: FrontClusterData;
  defaultOpen?: boolean;
  onOpenJob: (jobId: string) => void;
  onNewJob: (frontId: string, projectId?: string) => void;
}

export function BrainDrawerCard({
  cluster,
  defaultOpen = false,
  onOpenJob,
  onNewJob,
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { config, stats, projects, jobs } = cluster;
  const Icon = config.icon;

  const hasActivity = stats.total > 0 || projects.length > 0;

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200 bg-card overflow-hidden",
        isOpen
          ? "border-border shadow-sm ring-1 ring-border/50"
          : "border-border/60 hover:border-border hover:shadow-xs",
        !hasActivity && "opacity-75 hover:opacity-100"
      )}
    >
      {/* Cabeçalho da Gaveta */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none bg-muted/5 hover:bg-muted/10 transition-colors"
      >
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div
            className="size-11 rounded-xl flex items-center justify-center shrink-0 border shadow-xs"
            style={{
              backgroundColor: `${config.accentColor}15`,
              borderColor: `${config.accentColor}30`,
              color: config.accentColor,
            }}
          >
            <Icon className="size-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-base font-bold text-foreground tracking-tight">
                {config.title}
              </h3>
              <Badge variant="outline" className={cn("text-[10px] font-mono-kasa", config.badgeClass)}>
                {stats.total} {stats.total === 1 ? "job" : "jobs"}
              </Badge>
              {projects.length > 0 && (
                <span className="text-[11px] font-mono-kasa text-muted-foreground flex items-center gap-1">
                  <FolderKanban className="size-3 text-muted-foreground/70" />
                  {projects.length} {projects.length === 1 ? "projeto" : "projetos"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {config.shortDescription}
            </p>
          </div>
        </div>

        {/* Lado Direito: Progresso e Contadores */}
        <div className="flex items-center gap-4 sm:gap-6 justify-between md:justify-end shrink-0">
          {stats.total > 0 ? (
            <div className="flex items-center gap-3">
              <div className="w-28 sm:w-36 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono-kasa">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-bold text-foreground">{stats.progressPercentage}%</span>
                </div>
                <Progress value={stats.progressPercentage} className="h-1.5" />
              </div>

              {/* Pílulas de Status */}
              <div className="hidden sm:flex items-center gap-1.5 font-mono-kasa text-[10px]">
                {stats.inProgress > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 font-medium">
                    {stats.inProgress} andamento
                  </span>
                )}
                {stats.review > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium">
                    {stats.review} revisão
                  </span>
                )}
                {stats.overdue > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 font-bold flex items-center gap-0.5">
                    <AlertCircle className="size-2.5" /> {stats.overdue} atrasado
                  </span>
                )}
                {stats.completed > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium flex items-center gap-0.5">
                    <CheckCircle2 className="size-2.5" /> {stats.completed}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-[11px] font-mono-kasa text-muted-foreground italic">
              Nenhuma entrega em aberto
            </span>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onNewJob(config.id, projects[0]?.id);
              }}
              className="h-8 px-2.5 text-xs font-mono-kasa gap-1.5 hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">Criar Job</span>
            </Button>

            <div
              className={cn(
                "size-8 rounded-md flex items-center justify-center text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180 text-foreground"
              )}
            >
              <ChevronDown className="size-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Interior da Gaveta Expandida */}
      {isOpen && (
        <div className="border-t border-border/60 p-4 sm:p-5 space-y-4 bg-background/50">
          {/* Projetos vinculados a esta frente (se houver) */}
          {projects.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <FolderKanban className="size-3 text-muted-foreground" />
                Projetos da Frente ({projects.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-3 rounded-lg border border-border/60 bg-card hover:border-border transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-xs text-foreground truncate">{proj.name}</p>
                      <p className="text-[10px] font-mono-kasa text-muted-foreground">
                        {proj.total_jobs ? `${proj.completed_jobs || 0}/${proj.total_jobs} jobs` : "Em planejamento"}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-mono-kasa uppercase shrink-0">
                      {proj.status === "active" ? "Ativo" : proj.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Jobs desta Frente */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <CheckSquare className="size-3 text-muted-foreground" />
                Entregas & Jobs da Frente ({jobs.length})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNewJob(config.id, projects[0]?.id)}
                className="h-6 px-2 text-[10px] font-mono-kasa text-muted-foreground hover:text-foreground gap-1"
              >
                <Plus className="size-3" /> Adicionar Job
              </Button>
            </div>

            {jobs.length === 0 ? (
              <div className="py-8 border border-dashed border-border/60 rounded-lg text-center space-y-2">
                <Sparkles className="size-5 text-muted-foreground/40 mx-auto" />
                <p className="text-xs text-muted-foreground">
                  Nenhum job registrado nesta frente temática.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNewJob(config.id, projects[0]?.id)}
                  className="h-7 text-xs font-mono-kasa gap-1"
                >
                  <Plus className="size-3" /> Iniciar Primeira Entrega
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/60 border border-border/60 rounded-lg overflow-hidden bg-card">
                {jobs.map((job) => {
                  const isDone = job.status === "done" || (job as any).job_stages?.is_done;
                  const isOverdue = !isDone && job.due_date && job.due_date < new Date().toISOString().split("T")[0];

                  return (
                    <div
                      key={job.id}
                      onClick={() => onOpenJob(job.id)}
                      className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-muted/10 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "size-2 rounded-full shrink-0",
                            isDone
                              ? "bg-emerald-500"
                              : job.status === "in_progress"
                              ? "bg-blue-500 animate-pulse"
                              : job.status === "review"
                              ? "bg-amber-500"
                              : "bg-muted-foreground/50"
                          )}
                        />

                        <div className="min-w-0">
                          <p
                            className={cn(
                              "font-medium text-xs text-foreground truncate",
                              isDone && "line-through opacity-70"
                            )}
                          >
                            {job.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] font-mono-kasa text-muted-foreground flex-wrap mt-0.5">
                            {(job as any).services?.name && (
                              <span>{(job as any).services.name}</span>
                            )}
                            {(job as any).projects?.name && (
                              <span>• Projeto: {(job as any).projects.name}</span>
                            )}
                            {job.total_steps ? (
                              <span>
                                • {job.completed_steps || 0}/{job.total_steps} etapas
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Lado Direito do Item */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Prazo */}
                        {job.due_date && (
                          <div
                            className={cn(
                              "flex items-center gap-1 text-[10px] font-mono-kasa",
                              isOverdue
                                ? "text-red-500 font-bold"
                                : isDone
                                ? "text-muted-foreground line-through"
                                : "text-muted-foreground"
                            )}
                          >
                            <Clock className="size-3" />
                            {new Date(job.due_date).toLocaleDateString("pt-BR")}
                          </div>
                        )}

                        {/* Prioridade */}
                        <Badge
                          variant="outline"
                          className={cn(
                            "hidden md:inline-flex text-[9px] font-mono-kasa uppercase",
                            priorityColor(job.priority)
                          )}
                        >
                          {priorityLabel(job.priority)}
                        </Badge>

                        {/* Etapa */}
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-mono-kasa max-w-[100px] truncate"
                        >
                          {(job as any).job_stages?.name || job.status}
                        </Badge>

                        {/* Responsável */}
                        {(job as any).responsible ? (
                          <Avatar className="size-6 border border-border/80">
                            <AvatarImage src={(job as any).responsible?.photo_url} />
                            <AvatarFallback className="text-[9px] font-bold">
                              {(job as any).responsible?.name?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
