import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2,
  Circle,
  Clock,
  ListChecks,
  LayoutGrid,
  CheckSquare,
  X,
  Play,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

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

type Attachment = {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  category: string | null;
  created_at: string;
};

type ApprovalLog = {
  id: string;
  action: string;
  feedback: string | null;
  created_at: string;
  attachment_id: string | null;
};

type ApiResponse = {
  client: ClientInfo;
  jobs: JobRow[];
  responsibles: Record<string, { name: string | null; avatar: string | null }>;
  stages: Record<string, StageItem[]>;
  attachments: Record<string, Attachment[]>;
  approvals: Record<string, ApprovalLog[]>;
};

const STATUS_MAP: Record<string, { emoji: string; label: string; bg: string; text: string; border: string }> = {
  not_started: { emoji: "📥", label: "Novas Demandas", bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" },
  in_progress: { emoji: "⚙️", label: "Em Andamento", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  review: { emoji: "🔍", label: "Em Revisão", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  adjustments: { emoji: "👤", label: "Aguardando Cliente", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  done: { emoji: "🏁", label: "Concluído", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  cancelled: { emoji: "❌", label: "Cancelado", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

function isImage(att: Attachment) {
  const t = (att.file_type || "").toLowerCase();
  if (t.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(att.file_name);
}
function isVideo(att: Attachment) {
  const t = (att.file_type || "").toLowerCase();
  if (t.startsWith("video/")) return true;
  return /\.(mp4|mov|webm|m4v)$/i.test(att.file_name);
}

function MinhaKasaPage() {
  const { slug } = Route.useParams();
  const [tab, setTab] = useState<"projects" | "approvals">("projects");

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

  const { client, jobs, responsibles, stages, attachments, approvals } = data;
  const primary = client.brand_primary || "#FFBC45";
  const displayName = client.company || client.name;

  const approvalsJobs = jobs.filter(
    (j) => j.status === "review" && (attachments?.[j.id]?.length || 0) > 0,
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-white to-white pb-24">
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
                {tab === "projects"
                  ? "Acompanhe seus projetos em tempo real."
                  : "Materiais aguardando sua aprovação."}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* FEED */}
      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-6 space-y-4">
        {tab === "projects" ? (
          jobs.length === 0 ? (
            <EmptyState icon="📭" title="Nenhum projeto liberado no momento." subtitle="Em breve, novidades aparecerão por aqui." />
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
          )
        ) : approvalsJobs.length === 0 ? (
          <EmptyState
            icon="✅"
            title="Nada para aprovar agora."
            subtitle="Quando a equipe enviar materiais para sua revisão, eles aparecerão aqui."
          />
        ) : (
          approvalsJobs.map((job) => (
            <ApprovalCard
              key={job.id}
              slug={slug}
              job={job}
              attachments={attachments[job.id] || []}
              approvals={approvals?.[job.id] || []}
              primary={primary}
            />
          ))
        )}

        <footer className="text-center text-[10px] text-foreground/30 pt-12 pb-6 uppercase tracking-widest">
          Powered by Kasa Marketing
        </footer>
      </main>

      {/* TAB BAR */}
      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="max-w-3xl mx-auto grid grid-cols-2">
          <TabButton
            active={tab === "projects"}
            onClick={() => setTab("projects")}
            icon={<LayoutGrid className="size-5" />}
            label="Projetos"
            primary={primary}
          />
          <TabButton
            active={tab === "approvals"}
            onClick={() => setTab("approvals")}
            icon={<CheckSquare className="size-5" />}
            label="Aprovações"
            badge={approvalsJobs.length || undefined}
            primary={primary}
          />
        </div>
      </nav>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
  primary,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  primary: string;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center justify-center gap-0.5 py-3 transition-colors"
      style={{ color: active ? primary : undefined }}
    >
      <div className="relative">
        {icon}
        {badge ? (
          <span
            className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
            style={{ background: primary }}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <span className={`text-[10px] font-semibold uppercase tracking-wider ${active ? "" : "text-foreground/40"}`}>
        {label}
      </span>
    </button>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">{icon}</div>
      <p className="text-foreground/60 font-medium">{title}</p>
      <p className="text-foreground/40 text-sm mt-1">{subtitle}</p>
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
    <article className="bg-white border border-border rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden">
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

        {stages.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={() => setStagesOpen((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-foreground/60 hover:text-foreground transition-colors"
            >
              <span className="inline-flex items-center gap-1.5">
                <ListChecks className="size-3.5" />
                Etapas
                <span className="font-medium normal-case tracking-normal text-foreground/40">
                  ({stagesDone}/{stagesTotal})
                </span>
              </span>
              {stagesOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
            {stagesOpen && (
              <ul className="mt-3 space-y-2">
                {stages.map((s, idx) => {
                  const isCurrent = !s.done && stages.slice(0, idx).every((p) => p.done);
                  return (
                    <li key={s.id} className="flex items-center gap-2.5 text-sm">
                      {s.done ? (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                      ) : isCurrent ? (
                        <Clock className="size-4 shrink-0 text-amber-500" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-foreground/25" />
                      )}
                      <span className={`flex-1 ${s.done ? "text-foreground/40 line-through" : isCurrent ? "text-foreground font-medium" : "text-foreground/70"}`}>
                        {s.content}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          Agora
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

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

function ApprovalCard({
  slug,
  job,
  attachments,
  approvals,
  primary,
}: {
  slug: string;
  job: JobRow;
  attachments: Attachment[];
  approvals: ApprovalLog[];
  primary: string;
}) {
  const qc = useQueryClient();
  const [activeIdx, setActiveIdx] = useState(0);
  const [modal, setModal] = useState<null | "approve" | "adjust">(null);
  const [feedback, setFeedback] = useState("");

  const active = attachments[activeIdx];

  const mutation = useMutation({
    mutationFn: async (payload: {
      action: "approve" | "request_adjustment";
      attachment_id?: string;
      feedback?: string;
    }) => {
      const res = await fetch(`/api/public/portal-action/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.id, ...payload }),
      });
      if (!res.ok) throw new Error("action_failed");
      return res.json();
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["minha-kasa", slug] });
      if (vars.action === "approve") {
        toast.success("Arte aprovada com sucesso! ✅");
      } else {
        toast.success("Pedido de ajuste enviado à equipe! 🔄");
      }
      setModal(null);
      setFeedback("");
    },
    onError: () => {
      toast.error("Não foi possível registrar agora. Tente novamente.");
    },
  });

  const alreadyApproved = approvals.some((a) => a.action === "approved" && a.attachment_id === active?.id);

  return (
    <article className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
      {/* PREVIEW */}
      {active ? (
        <div className="relative bg-black/95 aspect-[4/5] sm:aspect-[16/10] flex items-center justify-center overflow-hidden">
          {isImage(active) ? (
            <img src={active.file_url} alt={active.file_name} className="w-full h-full object-contain" />
          ) : isVideo(active) ? (
            <video src={active.file_url} controls className="w-full h-full object-contain" />
          ) : (
            <a
              href={active.file_url}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-2 text-white/90 hover:text-white"
            >
              <FileText className="size-12" />
              <span className="text-sm font-medium">{active.file_name}</span>
              <span className="text-xs text-white/60">Abrir arquivo</span>
            </a>
          )}
        </div>
      ) : null}

      {/* THUMBNAILS */}
      {attachments.length > 1 && (
        <div className="flex gap-2 px-4 pt-3 overflow-x-auto">
          {attachments.map((att, i) => (
            <button
              key={att.id}
              onClick={() => setActiveIdx(i)}
              className={`shrink-0 size-14 rounded-lg overflow-hidden border-2 transition-all ${
                i === activeIdx ? "scale-105" : "opacity-60 hover:opacity-100"
              }`}
              style={{ borderColor: i === activeIdx ? primary : "transparent" }}
            >
              {isImage(att) ? (
                <img src={att.file_url} alt="" className="w-full h-full object-cover" />
              ) : isVideo(att) ? (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <Play className="size-5 text-white" />
                </div>
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <FileText className="size-5 text-foreground/40" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* META + ACTIONS */}
      <div className="p-5 space-y-4">
        <div>
          <h2 className="font-bold text-lg leading-tight">{job.title}</h2>
          {job.description && (
            <p className="text-sm text-foreground/60 mt-1 line-clamp-3">{job.description}</p>
          )}
          {active && (
            <p className="text-[11px] text-foreground/40 mt-2">
              📎 {active.file_name} · {format(new Date(active.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </div>

        {alreadyApproved && (
          <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" />
            Você já aprovou este material.
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setModal("approve")}
            disabled={mutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 text-sm transition-colors shadow-sm"
          >
            <CheckCircle2 className="size-4" /> Aprovar
          </button>
          <button
            onClick={() => setModal("adjust")}
            disabled={mutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 text-sm transition-colors shadow-sm"
          >
            🔄 Solicitar Ajuste
          </button>
        </div>

        {approvals.length > 0 && (
          <details className="text-xs text-foreground/50">
            <summary className="cursor-pointer hover:text-foreground/80">Histórico ({approvals.length})</summary>
            <ul className="mt-2 space-y-1">
              {approvals.slice(0, 6).map((a) => (
                <li key={a.id} className="border-l-2 pl-2 border-border">
                  <span className="font-semibold">
                    {a.action === "approved" ? "✅ Aprovado" : a.action === "adjustment_requested" ? "🔄 Ajuste" : "💬 Comentário"}
                  </span>{" "}
                  · {format(new Date(a.created_at), "dd/MM HH:mm")}
                  {a.feedback && <div className="text-foreground/70 mt-0.5">{a.feedback}</div>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => !mutation.isPending && setModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold text-lg">
                {modal === "approve" ? "Confirmar aprovação" : "Solicitar ajuste"}
              </h3>
              <button onClick={() => !mutation.isPending && setModal(null)} className="text-foreground/40 hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            {modal === "approve" ? (
              <p className="text-sm text-foreground/70">
                Confirmar aprovação de <strong>{active?.file_name || job.title}</strong>? A equipe será notificada imediatamente.
              </p>
            ) : (
              <>
                <p className="text-sm text-foreground/70 mb-3">Descreva o ajuste necessário:</p>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  placeholder="Ex: trocar a cor do título para laranja, reduzir o logo..."
                />
              </>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => setModal(null)}
                disabled={mutation.isPending}
                className="rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                disabled={mutation.isPending || (modal === "adjust" && feedback.trim().length < 3)}
                onClick={() =>
                  mutation.mutate(
                    modal === "approve"
                      ? { action: "approve", attachment_id: active?.id }
                      : { action: "request_adjustment", attachment_id: active?.id, feedback: feedback.trim() },
                  )
                }
                className={`rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50 ${
                  modal === "approve" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                {mutation.isPending ? "Enviando..." : modal === "approve" ? "Confirmar" : "Enviar pedido"}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
