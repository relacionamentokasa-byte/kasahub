import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Calendar, User, ChevronDown, ChevronUp, Sparkles, CheckCircle2, Circle, Clock, ListChecks } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/minha-kasa/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Minha Kasa — ${params.slug}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MinhaKasaPage,
});

type JobRow = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  due_date: string | null;
  progress_percentage: number | null;
  updated_at: string;
  main_responsible_id: string | null;
  priority: string | null;
};

type ClientInfo = {
  id: string;
  name: string;
  company: string | null;
  logo_url: string | null;
  brand_primary: string | null;
  portal_cover_url: string | null;
};

type StageItem = { id: string; content: string; done: boolean; order_index: number };

type ApiResponse = {
  client: ClientInfo;
  jobs: JobRow[];
  responsibles: Record<string, { name: string | null; avatar: string | null }>;
  stages: Record<string, StageItem[]>;
};

const STATUS_MAP: Record<string, { emoji: string; label: string; bg: string; text: string; border: string }> = {
  not_started: { emoji: "📥", label: "Novas Demandas", bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" },
  in_progress: { emoji: "⚙️", label: "Em Andamento", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  review: { emoji: "🔍", label: "Em Revisão", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  adjustments: { emoji: "👤", label: "Aguardando Cliente", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  done: { emoji: "🏁", label: "Concluído", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  cancelled: { emoji: "❌", label: "Cancelado", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

function MinhaKasaPage() {
  const { slug } = Route.useParams();

  const { data, isLoading, error } = useQuery<ApiResponse>({
    queryKey: ["minha-kasa", slug],
    queryFn: async () => {
      const res = await fetch(`/api/public/portal-jobs/${slug}`, { cache: "no-store" });
      if (!res.ok) throw new Error("not_found");
      return res.json();
    },
    refetchInterval: 15_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white">
        <div className="text-foreground/50 text-sm">Carregando seu painel...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white p-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2">Portal não encontrado</h1>
          <p className="text-foreground/50">Verifique o link recebido pela Kasa Marketing.</p>
        </div>
      </div>
    );
  }

  const { client, jobs, responsibles, stages } = data;
  const primary = client.brand_primary || "#FFBC45";
  const displayName = client.company || client.name;

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-white to-white">
      {/* HEADER */}
      <header
        className="relative overflow-hidden border-b border-border"
        style={{ background: `linear-gradient(135deg, ${primary}25 0%, ${primary}05 100%)` }}
      >
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
          <div className="flex items-center gap-4">
            {client.logo_url ? (
              <img src={client.logo_url} alt={displayName} className="size-14 rounded-2xl object-cover border border-border bg-white" />
            ) : (
              <div
                className="size-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-sm"
                style={{ background: primary }}
              >
                {displayName.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-foreground/40">
                <Sparkles className="size-3" style={{ color: primary }} />
                Minha Kasa
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-0.5">
                Olá, {client.name.split(" ")[0]}!
              </h1>
              <p className="text-xs text-foreground/50 mt-1">
                Acompanhe seus projetos em tempo real.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* FEED */}
      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-8 space-y-4">
        {jobs.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-foreground/60 font-medium">Nenhum projeto liberado no momento.</p>
            <p className="text-foreground/40 text-sm mt-1">Em breve, novidades aparecerão por aqui.</p>
          </div>
        ) : (
          jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              responsible={job.main_responsible_id ? responsibles[job.main_responsible_id] : null}
              stages={stages?.[job.id] || []}
              primary={primary}
            />
          ))
        )}

        <footer className="text-center text-[10px] text-foreground/30 pt-12 pb-6 uppercase tracking-widest">
          Powered by Kasa Marketing
        </footer>
      </main>
    </div>
  );
}

function JobCard({
  job,
  responsible,
  stages,
  primary,
}: {
  job: JobRow;
  responsible: { name: string | null; avatar: string | null } | null;
  stages: StageItem[];
  primary: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [stagesOpen, setStagesOpen] = useState(true);
  const status = STATUS_MAP[job.status || "not_started"] || STATUS_MAP.not_started;
  const stagesDone = stages.filter((s) => s.done).length;
  const stagesTotal = stages.length;
  const progress = stagesTotal > 0 ? Math.round((stagesDone / stagesTotal) * 100) : (job.progress_percentage ?? 0);

  return (
    <article
      className="bg-white border border-border rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="font-bold text-lg sm:text-xl leading-tight flex-1">{job.title}</h2>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${status.bg} ${status.text} ${status.border}`}
          >
            <span>{status.emoji}</span>
            <span className="hidden sm:inline">{status.label}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-foreground/60 mb-4">
          {job.due_date && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              {format(new Date(job.due_date), "dd 'de' MMM", { locale: ptBR })}
            </span>
          )}
          {responsible?.name && (
            <span className="inline-flex items-center gap-1.5">
              <User className="size-3.5" />
              {responsible.name}
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-foreground/40">
            <span>Progresso</span>
            <span style={{ color: primary }}>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {job.description && (
          <>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-foreground/60 hover:text-foreground transition-colors"
            >
              {expanded ? <>Ocultar detalhes <ChevronUp className="size-3.5" /></> : <>Ver detalhes <ChevronDown className="size-3.5" /></>}
            </button>
            {expanded && (
              <div className="mt-3 pt-3 border-t border-border text-sm text-foreground/70 whitespace-pre-wrap leading-relaxed">
                {job.description}
              </div>
            )}
          </>
        )}
      </div>
    </article>
  );
}
