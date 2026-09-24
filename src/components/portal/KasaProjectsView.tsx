import React, { useState } from "react";
import {
  FolderKanban,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  User,
  ArrowRight,
  Sparkles,
  ChevronRight,
  ListChecks,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ProjectJob {
  id: string;
  title: string;
  description?: string | null;
  status: string | null;
  stage_id?: string | null;
  due_date?: string | null;
  progress_percentage?: number | null;
  completed_steps?: number | null;
  total_steps?: number | null;
  done_at?: string | null;
  updated_at?: string;
  main_responsible_id?: string | null;
  priority?: string | null;
}

interface KasaProjectsViewProps {
  jobs: ProjectJob[];
  stages?: Record<string, Array<{ id: string; content: string; done: boolean }>>;
  responsibles?: Record<string, { name: string | null; avatar: string | null }>;
  clientBrandColor?: string;
}

export function KasaProjectsView({
  jobs,
  stages = {},
  responsibles = {},
  clientBrandColor = "#FFBC45",
}: KasaProjectsViewProps) {
  const [filter, setFilter] = useState<"all" | "in_progress" | "done">("all");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(
    jobs[0]?.id || null
  );

  const filteredJobs = jobs.filter((j) => {
    if (filter === "in_progress") return j.status !== "done";
    if (filter === "done") return j.status === "done";
    return true;
  });

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];
  const checklist = selectedJob ? stages[selectedJob.id] || [] : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* 1. Header do Módulo — Padrão Clean Kasa Hub */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E9E4DC] pb-4">
        <div>
          <span className="text-[10px] font-mono-kasa uppercase tracking-widest font-bold text-[#869296]">
            OPERAÇÃO · PROJETOS & JOBS
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-[#0C1618] mt-0.5">
            Projetos & Demandas
          </h1>
          <p className="text-xs text-[#6A787B] mt-0.5">
            Acompanhe o cronograma, status e etapas operacionais de cada projeto estratégico.
          </p>
        </div>

        {/* Filtros em Pílula */}
        <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E9E4DC] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === "all"
                ? "bg-white text-[#0C1618] shadow-xs font-bold"
                : "text-[#869296] hover:text-[#0C1618]"
            }`}
          >
            Todos ({jobs.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("in_progress")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === "in_progress"
                ? "bg-white text-[#0C1618] shadow-xs font-bold"
                : "text-[#869296] hover:text-[#0C1618]"
            }`}
          >
            Em Andamento
          </button>
          <button
            type="button"
            onClick={() => setFilter("done")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === "done"
                ? "bg-white text-[#0C1618] shadow-xs font-bold"
                : "text-[#869296] hover:text-[#0C1618]"
            }`}
          >
            Concluídos
          </button>
        </div>
      </div>

      {filteredJobs.length === 0 ? (
        <div className="bg-white border border-[#E9E4DC] rounded-2xl p-12 text-center space-y-2 shadow-sm">
          <div className="size-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
            <FolderKanban className="size-5" />
          </div>
          <h3 className="font-bold text-sm text-[#0C1618]">
            Nenhum projeto encontrado
          </h3>
          <p className="text-xs text-[#869296] max-w-sm mx-auto">
            Não há projetos cadastrados nesta categoria no momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Coluna 1: Lista de Projetos (Col 1-5) */}
          <div className="lg:col-span-5 space-y-3">
            {filteredJobs.map((job) => {
              const isSelected = job.id === selectedJob?.id;
              const isDone = job.status === "done";
              const progress = job.progress_percentage || (isDone ? 100 : 50);

              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[#FAF8F5] border-[#0C1618] shadow-xs"
                      : "bg-white border-[#E9E4DC] hover:border-[#D1C9BC] hover:bg-[#FAF8F5]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        isDone
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                          : "bg-blue-50 text-blue-700 border-blue-200/60"
                      }`}
                    >
                      {isDone ? "Concluído" : "Em Produção"}
                    </span>

                    {job.due_date && (
                      <span className="text-[11px] text-[#869296] font-mono-kasa flex items-center gap-1">
                        <Calendar className="size-3" />
                        {format(new Date(job.due_date), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-bold text-[#0C1618] mt-2 truncate">
                    {job.title}
                  </h3>

                  {job.description && (
                    <p className="text-[11px] text-[#6A787B] line-clamp-2 mt-0.5 leading-relaxed">
                      {job.description}
                    </p>
                  )}

                  {/* Barra de Progresso */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono-kasa">
                      <span className="text-[#869296]">Progresso</span>
                      <span className="font-bold text-[#0C1618]">{progress}%</span>
                    </div>
                    <div className="bg-[#F0EBE1] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: isDone ? "#10B981" : clientBrandColor,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Coluna 2: Detalhes do Projeto & Checklist (Col 6-12) */}
          <div className="lg:col-span-7 bg-white border border-[#E9E4DC] rounded-2xl p-6 shadow-sm space-y-5">
            {selectedJob && (
              <>
                <div className="border-b border-[#F0EBE1] pb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono-kasa uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#FAF8F5] text-[#869296] border border-[#E9E4DC]">
                      Demanda Estratégica
                    </span>
                    <span className="text-xs text-[#869296] font-mono-kasa">
                      Atualizado recentemente
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-[#0C1618]">
                    {selectedJob.title}
                  </h2>
                  {selectedJob.description && (
                    <p className="text-xs text-[#526063] leading-relaxed bg-[#FAF8F5] p-3 rounded-xl border border-[#E9E4DC]">
                      {selectedJob.description}
                    </p>
                  )}
                </div>

                {/* Checklist de Etapas */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-mono-kasa uppercase font-bold text-[#869296] flex items-center gap-1.5">
                    <ListChecks className="size-3.5 text-[#0C1618]" />
                    <span>Etapas de Execução</span>
                  </h4>

                  {checklist.length === 0 ? (
                    <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E9E4DC] text-center text-xs text-[#869296]">
                      Etapas sendo detalhadas pelo time de produção Kasa.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {checklist.map((step, idx) => (
                        <div
                          key={step.id || idx}
                          className="flex items-center gap-3 p-3 rounded-xl border border-[#E9E4DC] bg-white text-xs"
                        >
                          <div
                            className={`size-4.5 rounded-md flex items-center justify-center shrink-0 ${
                              step.done
                                ? "bg-emerald-500 text-white"
                                : "border border-[#D1C9BC]"
                            }`}
                          >
                            {step.done && <CheckCircle2 className="size-3" />}
                          </div>
                          <span
                            className={
                              step.done
                                ? "text-[#869296] line-through font-medium"
                                : "text-[#0C1618] font-bold"
                            }
                          >
                            {step.content}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
