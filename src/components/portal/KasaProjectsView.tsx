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
  Columns3,
  List,
  GitCommit,
  Rocket,
  Plus,
  ArrowUpRight,
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
  category?: "lancamento" | "evento" | "institucional" | "geral";
}

interface KasaProjectsViewProps {
  jobs: ProjectJob[];
  stages?: Record<string, Array<{ id: string; content: string; done: boolean }>>;
  responsibles?: Record<string, { name: string | null; avatar: string | null }>;
  clientBrandColor?: string;
}

const KANBAN_COLUMNS = [
  { id: "planejamento", label: "Planejamento & Briefing", color: "#869296" },
  { id: "producao", label: "Em Produção Ativa", color: "#3B82F6" },
  { id: "revisao", label: "Revisão & Testes", color: "#F59E0B" },
  { id: "concluido", label: "Entregue & Concluído", color: "#10B981" },
];

export function KasaProjectsView({
  jobs,
  stages = {},
  responsibles = {},
  clientBrandColor = "#FFBC45",
}: KasaProjectsViewProps) {
  const [viewMode, setViewMode] = useState<"kanban" | "timeline" | "list">("kanban");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(
    jobs[0]?.id || null
  );

  const sampleJobs: ProjectJob[] =
    jobs.length > 0
      ? jobs
      : [
          {
            id: "pj-1",
            title: "Lançamento do Novo Site Institucional & E-commerce",
            description: "Desenvolvimento completo de arquitetura, copy de vendas e integração com gateways.",
            status: "in_progress",
            due_date: "2026-10-15",
            progress_percentage: 75,
            priority: "alta",
            category: "lancamento",
          },
          {
            id: "pj-2",
            title: "Campanha Black Friday & Q4 - Planejamento 360°",
            description: "Estruturação de ofertas, criação de criativos em massa e disparo de e-mail marketing.",
            status: "planning",
            due_date: "2026-11-01",
            progress_percentage: 30,
            priority: "alta",
            category: "lancamento",
          },
          {
            id: "pj-3",
            title: "Cobertura Audiovisual do Evento Anual de Liderança",
            description: "Captação com 2 câmeras, cortes em tempo real para stories e vídeo pós-evento.",
            status: "done",
            due_date: "2026-09-25",
            progress_percentage: 100,
            priority: "media",
            category: "evento",
          },
          {
            id: "pj-4",
            title: "Reformulação de Embalagens & Rótulos Linha 2026",
            description: "Novo estudo de faca especial, impressão fosca e verniz localizado com gráfica parceira.",
            status: "in_progress",
            due_date: "2026-10-20",
            progress_percentage: 60,
            priority: "alta",
            category: "institucional",
          },
        ];

  const filteredJobs = sampleJobs.filter((j) => {
    if (filterCategory === "all") return true;
    return j.category === filterCategory;
  });

  const selectedJob = sampleJobs.find((j) => j.id === selectedJobId) || sampleJobs[0];
  const checklist = selectedJob ? stages[selectedJob.id] || [] : [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      {/* 1. Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E9E4DC] pb-5">
        <div>
          <span className="text-[10px] font-mono-kasa uppercase tracking-widest font-bold text-[#869296] flex items-center gap-1.5">
            <Rocket className="size-3.5 text-[#FFBC45]" />
            OPERAÇÃO ESTRATÉGICA · PROJETOS, CAMPANHAS & LANÇAMENTOS
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-[#0C1618] mt-1">
            Projetos & Linha do Tempo
          </h1>
          <p className="text-xs text-[#6A787B] mt-0.5">
            Acompanhe o roadmap e o progresso em tempo real das demandas especiais e lançamentos da sua marca.
          </p>
        </div>

        {/* Controles de Visualização: Kanban vs Linha do Tempo vs Lista */}
        <div className="flex items-center gap-1 bg-[#F5F2EC] p-1 rounded-xl border border-[#E9E4DC]">
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === "kanban"
                ? "bg-white text-[#0C1618] shadow-xs"
                : "text-[#869296] hover:text-[#0C1618]"
            }`}
          >
            <Columns3 className="size-3.5" />
            <span>Quadro Kanban</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("timeline")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === "timeline"
                ? "bg-white text-[#0C1618] shadow-xs"
                : "text-[#869296] hover:text-[#0C1618]"
            }`}
          >
            <GitCommit className="size-3.5" />
            <span>Linha do Tempo</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === "list"
                ? "bg-white text-[#0C1618] shadow-xs"
                : "text-[#869296] hover:text-[#0C1618]"
            }`}
          >
            <List className="size-3.5" />
            <span>Lista & Detalhes</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VISUALIZAÇÃO EM QUADRO KANBAN                                         */}
      {/* ========================================================================= */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const colJobs = filteredJobs.filter((job) => {
              if (col.id === "planejamento") return job.status === "planning" || (job.progress_percentage || 0) < 40;
              if (col.id === "producao") return job.status === "in_progress" && (job.progress_percentage || 0) >= 40 && (job.progress_percentage || 0) < 80;
              if (col.id === "revisao") return (job.progress_percentage || 0) >= 80 && job.status !== "done";
              if (col.id === "concluido") return job.status === "done" || (job.progress_percentage || 0) === 100;
              return false;
            });

            return (
              <div
                key={col.id}
                className="bg-[#FAF8F5] rounded-2xl p-3.5 border border-[#E9E4DC] space-y-3 min-h-[360px]"
              >
                {/* Header da Coluna */}
                <div className="flex items-center justify-between pb-2 border-b border-[#E9E4DC]">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                    <h4 className="font-display text-xs font-bold text-[#0C1618]">
                      {col.label}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-white text-[#869296] text-[10px] font-mono font-bold border border-[#E9E4DC]">
                    {colJobs.length}
                  </span>
                </div>

                {/* Cards da Coluna */}
                <div className="space-y-3">
                  {colJobs.map((job) => {
                    const progress = job.progress_percentage || 50;

                    return (
                      <div
                        key={job.id}
                        className="p-4 rounded-xl bg-white border border-[#E9E4DC] shadow-xs hover:shadow-md transition space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E9E4DC] text-[9px] font-mono font-bold uppercase text-[#869296]">
                            {job.category || "Demanda"}
                          </span>
                          {job.due_date && (
                            <span className="text-[10px] font-mono text-[#869296] flex items-center gap-1">
                              <Calendar className="size-3" />
                              {new Date(job.due_date).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </span>
                          )}
                        </div>

                        <h5 className="font-display text-xs font-bold text-[#0C1618] line-clamp-2">
                          {job.title}
                        </h5>

                        {job.description && (
                          <p className="text-[11px] text-[#6A787B] line-clamp-2 leading-relaxed">
                            {job.description}
                          </p>
                        )}

                        {/* Barra de Progresso */}
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-[#869296]">Progresso</span>
                            <span className="font-bold text-[#0C1618]">{progress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#F0EBE1] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: progress === 100 ? "#10B981" : clientBrandColor,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VISUALIZAÇÃO EM LINHA DO TEMPO (ROADMAP CRONOLÓGICO)                   */}
      {/* ========================================================================= */}
      {viewMode === "timeline" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9E4DC] shadow-xs space-y-6">
          <div>
            <h3 className="font-display text-lg font-bold text-[#0C1618]">
              Cronograma Estratégico de Entregas
            </h3>
            <p className="text-xs text-[#6A787B]">
              Marcos temporais e prazos finais alinhados com o time de gestão da Kasa.
            </p>
          </div>

          <div className="relative pl-6 sm:pl-8 border-l-2 border-amber-200 space-y-8 my-4">
            {filteredJobs.map((job, idx) => {
              const isDone = job.status === "done" || (job.progress_percentage || 0) === 100;

              return (
                <div key={job.id} className="relative group">
                  {/* Ponto na Linha do Tempo */}
                  <div
                    className={`absolute -left-[31px] sm:-left-[39px] size-5 rounded-full border-4 border-white flex items-center justify-center transition ${
                      isDone ? "bg-emerald-500 ring-2 ring-emerald-200" : "bg-[#FFBC45] ring-2 ring-amber-200"
                    }`}
                  />

                  <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF8F5] border border-[#E9E4DC] hover:bg-white hover:shadow-md transition space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isDone
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {isDone ? "Entregue" : "Em Andamento"}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-[#869296]">
                          Entrega: {job.due_date ? new Date(job.due_date).toLocaleDateString("pt-BR") : "A definir"}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#0C1618]">
                        {job.progress_percentage || (isDone ? 100 : 50)}% Concluído
                      </span>
                    </div>

                    <h4 className="font-display text-base font-bold text-[#0C1618]">
                      {job.title}
                    </h4>
                    <p className="text-xs text-[#6A787B] leading-relaxed">
                      {job.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VISUALIZAÇÃO EM LISTA & DETALHES COM CHECKLIST                         */}
      {/* ========================================================================= */}
      {viewMode === "list" && (
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
                  className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
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
                        {new Date(job.due_date).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>

                  <h3 className="font-display text-xs font-bold text-[#0C1618] mt-2 truncate">
                    {job.title}
                  </h3>

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

          {/* Coluna 2: Detalhes do Projeto Selecionado & Checklist */}
          <div className="lg:col-span-7 bg-white border border-[#E9E4DC] rounded-3xl p-6 shadow-xs space-y-5">
            {selectedJob && (
              <>
                <div className="border-b border-[#F0EBE1] pb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono-kasa uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#FAF8F5] text-[#869296] border border-[#E9E4DC]">
                      Demanda Estratégica
                    </span>
                    <span className="text-xs text-[#869296] font-mono-kasa">
                      Prazo: {selectedJob.due_date ? new Date(selectedJob.due_date).toLocaleDateString("pt-BR") : "A definir"}
                    </span>
                  </div>
                  <h2 className="font-display text-base sm:text-lg font-bold text-[#0C1618]">
                    {selectedJob.title}
                  </h2>
                  {selectedJob.description && (
                    <p className="text-xs text-[#526063] leading-relaxed bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E9E4DC]">
                      {selectedJob.description}
                    </p>
                  )}
                </div>

                {/* Etapas */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-mono-kasa uppercase font-bold text-[#869296] flex items-center gap-1.5">
                    <ListChecks className="size-3.5 text-[#0C1618]" />
                    <span>Etapas de Execução do Projeto</span>
                  </h4>

                  <div className="space-y-2">
                    {[
                      { content: "Briefing estratégico e alinhamento de escopo", done: true },
                      { content: "Criação de identidade e layout inicial", done: true },
                      { content: "Validação com equipe de gestão e cliente", done: true },
                      { content: "Desenvolvimento técnico e ajustes finais", done: false },
                      { content: "Entrega oficial e publicação", done: false },
                    ].map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-xl border border-[#E9E4DC] bg-[#FAF8F5] text-xs"
                      >
                        <div
                          className={`size-4.5 rounded-md flex items-center justify-center shrink-0 ${
                            step.done
                              ? "bg-emerald-500 text-white"
                              : "border border-[#D1C9BC] bg-white"
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
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
