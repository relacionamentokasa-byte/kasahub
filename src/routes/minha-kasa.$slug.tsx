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
  Wallet,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

type Invoice = {
  id: string;
  description: string | null;
  amount: number;
  due_date: string | null;
  payment_date: string | null;
  status: string | null;
  payment_method: string | null;
  created_at: string;
};

type ApiResponse = {
  client: ClientInfo;
  jobs: JobRow[];
  responsibles: Record<string, { name: string | null; avatar: string | null }>;
  stages: Record<string, StageItem[]>;
  attachments: Record<string, Attachment[]>;
  approvals: Record<string, ApprovalLog[]>;
  invoices: Invoice[];
};

// High-contrast status pills: solid colored bg + white text
const STATUS_MAP: Record<string, { emoji: string; label: string; cls: string }> = {
  not_started: { emoji: "📥", label: "Novas Demandas", cls: "bg-[#9CA3AF] text-white border-[#9CA3AF]" },
  in_progress: { emoji: "⚙️", label: "Em Andamento", cls: "bg-[#3B82F6] text-white border-[#3B82F6]" },
  review: { emoji: "🔍", label: "Em Revisão", cls: "bg-[#FFBC45] text-white border-[#FFBC45]" },
  adjustments: { emoji: "👤", label: "Aguardando Cliente", cls: "bg-[#F97316] text-white border-[#F97316]" },
  done: { emoji: "🏁", label: "Concluído", cls: "bg-[#10B981] text-white border-[#10B981]" },
  cancelled: { emoji: "❌", label: "Cancelado", cls: "bg-rose-500 text-white border-rose-500" },
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
  const [tab, setTab] = useState<"projects" | "approvals" | "finance">("projects");

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
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="text-slate-600 text-sm font-medium">Carregando seu painel...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2 text-slate-900">Portal não encontrado</h1>
          <p className="text-slate-600">Verifique o link recebido pela Kasa Marketing.</p>
        </div>
      </div>
    );
  }

  const { client, jobs, responsibles, stages, attachments, approvals, invoices } = data;
  const displayName = client.company || client.name;

  const approvalsJobs = jobs.filter(
    (j) => j.status === "review" && (attachments?.[j.id]?.length || 0) > 0,
  );

  const pendingInvoicesCount = (invoices || []).filter(
    (i) => (i.status || "").toLowerCase() !== "paid" && (i.status || "").toLowerCase() !== "pago",
  ).length;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 text-slate-900">
      {/* HEADER */}
      <header className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-[#0C1618] to-[#1A2D33]">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
          <div className="flex items-center gap-4">
            {client.logo_url ? (
              <img
                src={client.logo_url}
                alt={displayName}
                className="size-14 rounded-2xl object-cover border-2 border-white/20 bg-white shadow-md"
              />
            ) : (
              <div className="size-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md bg-[#FFBC45]">
                {displayName.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-[#FFBC45]">
                <Sparkles className="size-3" />
                Minha Kasa
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-0.5 text-white">
                Olá, {client.name.split(" ")[0]}!
              </h1>
              <p className="text-xs text-white/80 mt-1 font-medium">
                {tab === "projects"
                  ? "Acompanhe seus projetos em tempo real."
                  : tab === "approvals"
                    ? "Materiais aguardando sua aprovação."
                    : "Suas faturas e pagamentos."}
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
            />
          ))
        )}

        <footer className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-12 pb-6 font-semibold">
          <span className="inline-flex items-center justify-center size-5 rounded-md bg-[#FFBC45] text-white text-[10px] font-black">K</span>
          <span>Powered by <span className="text-slate-700 font-bold">Kasa Marketing</span></span>
        </footer>
      </main>

      {/* TAB BAR */}
      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <div className="max-w-3xl mx-auto grid grid-cols-2">
          <TabButton
            active={tab === "projects"}
            onClick={() => setTab("projects")}
            icon={<LayoutGrid className="size-5" />}
            label="Projetos"
          />
          <TabButton
            active={tab === "approvals"}
            onClick={() => setTab("approvals")}
            icon={<CheckSquare className="size-5" />}
            label="Aprovações"
            badge={approvalsJobs.length || undefined}
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
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-0.5 py-3 transition-colors ${
        active ? "text-[#FFBC45]" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      <div className="relative">
        {icon}
        {badge ? (
          <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center bg-[#F97316]">
            {badge}
          </span>
        ) : null}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider">
        {label}
      </span>
    </button>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">{icon}</div>
      <p className="text-slate-800 font-semibold">{title}</p>
      <p className="text-slate-600 text-sm mt-1">{subtitle}</p>
    </div>
  );
}

function JobCard({
  job,
  responsible,
  stages,
}: {
  job: JobRow;
  responsible: { name: string | null; avatar: string | null } | null;
  stages: StageItem[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [stagesOpen, setStagesOpen] = useState(true);
  const status = STATUS_MAP[job.status || "not_started"] || STATUS_MAP.not_started;
  const stagesDone = stages.filter((s) => s.done).length;
  const stagesTotal = stages.length;
  const progress = stagesTotal > 0 ? Math.round((stagesDone / stagesTotal) * 100) : (job.progress_percentage ?? 0);

  return (
    <article className="bg-white border border-slate-200 rounded-2xl shadow-[0_4px_16px_rgba(15,23,42,0.08)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.12)] transition-all overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="font-bold text-lg sm:text-xl leading-tight flex-1 text-slate-900">{job.title}</h2>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap shadow-sm ${status.cls}`}
          >
            <span>{status.emoji}</span>
            <span className="hidden sm:inline">{status.label}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 mb-4 font-medium">
          {job.due_date && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5 text-[#FFBC45]" />
              {format(new Date(job.due_date), "dd 'de' MMM", { locale: ptBR })}
            </span>
          )}
          {responsible?.name && (
            <span className="inline-flex items-center gap-1.5">
              <User className="size-3.5 text-[#0C1618]" />
              {responsible.name}
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold">
            <span className="text-slate-700">Progresso</span>
            <span className="text-slate-900">{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FFBC45] to-[#FFA500] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {stages.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <button
              onClick={() => setStagesOpen((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 transition-colors"
            >
              <span className="inline-flex items-center gap-1.5">
                <ListChecks className="size-3.5 text-[#FFBC45]" />
                Etapas
                <span className="font-semibold normal-case tracking-normal text-slate-600">
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
                        <CheckCircle2 className="size-4 shrink-0 text-[#10B981]" />
                      ) : isCurrent ? (
                        <Clock className="size-4 shrink-0 text-[#FFBC45]" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-slate-400" />
                      )}
                      <span
                        className={`flex-1 ${
                          s.done
                            ? "text-[#10B981] font-medium"
                            : isCurrent
                              ? "text-slate-900 font-semibold"
                              : "text-slate-600"
                        }`}
                      >
                        {s.content}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FFBC45] text-white shadow-sm">
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
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-[#FFBC45] transition-colors"
            >
              {expanded ? <>Ocultar detalhes <ChevronUp className="size-3.5" /></> : <>Ver detalhes <ChevronDown className="size-3.5" /></>}
            </button>
            {expanded && (
              <div className="mt-3 pt-3 border-t border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
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
}: {
  slug: string;
  job: JobRow;
  attachments: Attachment[];
  approvals: ApprovalLog[];
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
    <article className="bg-white border border-slate-200 rounded-2xl shadow-[0_4px_16px_rgba(15,23,42,0.08)] overflow-hidden">
      {/* PREVIEW */}
      {active ? (
        <div className="relative bg-slate-900 aspect-[4/5] sm:aspect-[16/10] flex items-center justify-center overflow-hidden">
          {isImage(active) ? (
            <img src={active.file_url} alt={active.file_name} className="w-full h-full object-contain" />
          ) : isVideo(active) ? (
            <video src={active.file_url} controls className="w-full h-full object-contain" />
          ) : (
            <a
              href={active.file_url}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-2 text-white hover:text-[#FFBC45]"
            >
              <FileText className="size-12" />
              <span className="text-sm font-semibold">{active.file_name}</span>
              <span className="text-xs text-white/80">Abrir arquivo</span>
            </a>
          )}
        </div>
      ) : null}

      {/* THUMBNAILS */}
      {attachments.length > 1 && (
        <div className="flex gap-2 px-4 pt-3 overflow-x-auto bg-white">
          {attachments.map((att, i) => (
            <button
              key={att.id}
              onClick={() => setActiveIdx(i)}
              className={`shrink-0 size-14 rounded-lg overflow-hidden border-2 transition-all ${
                i === activeIdx ? "border-[#FFBC45] scale-105" : "border-slate-200 opacity-70 hover:opacity-100"
              }`}
            >
              {isImage(att) ? (
                <img src={att.file_url} alt="" className="w-full h-full object-cover" />
              ) : isVideo(att) ? (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                  <Play className="size-5 text-white" />
                </div>
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                  <FileText className="size-5 text-slate-600" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* META + ACTIONS */}
      <div className="p-5 space-y-4">
        <div>
          <h2 className="font-bold text-lg leading-tight text-slate-900">{job.title}</h2>
          {job.description && (
            <p className="text-sm text-slate-700 mt-1 line-clamp-3">{job.description}</p>
          )}
          {active && (
            <p className="text-[11px] text-slate-600 mt-2 font-medium">
              📎 {active.file_name} · {format(new Date(active.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </div>

        {alreadyApproved && (
          <div className="text-xs font-bold text-white bg-[#10B981] rounded-lg px-3 py-2 inline-flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="size-3.5" />
            Você já aprovou este material.
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setModal("approve")}
            disabled={mutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#10B981] hover:bg-[#0EA371] disabled:opacity-50 text-white font-bold py-3 text-sm transition-colors shadow-md"
          >
            <CheckCircle2 className="size-4" /> Aprovar
          </button>
          <button
            onClick={() => setModal("adjust")}
            disabled={mutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F97316] hover:bg-[#EA6A0F] disabled:opacity-50 text-white font-bold py-3 text-sm transition-colors shadow-md"
          >
            🔄 Solicitar Ajuste
          </button>
        </div>

        {approvals.length > 0 && (
          <details className="text-xs text-slate-700">
            <summary className="cursor-pointer hover:text-slate-900 font-semibold">Histórico ({approvals.length})</summary>
            <ul className="mt-2 space-y-1">
              {approvals.slice(0, 6).map((a) => (
                <li key={a.id} className="border-l-2 pl-2 border-slate-300">
                  <span className="font-bold text-slate-900">
                    {a.action === "approved" ? "✅ Aprovado" : a.action === "adjustment_requested" ? "🔄 Ajuste" : "💬 Comentário"}
                  </span>{" "}
                  <span className="text-slate-600">· {format(new Date(a.created_at), "dd/MM HH:mm")}</span>
                  {a.feedback && <div className="text-slate-700 mt-0.5">{a.feedback}</div>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center p-4" onClick={() => !mutation.isPending && setModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold text-lg text-slate-900">
                {modal === "approve" ? "Confirmar aprovação" : "Solicitar ajuste"}
              </h3>
              <button onClick={() => !mutation.isPending && setModal(null)} className="text-slate-600 hover:text-slate-900">
                <X className="size-5" />
              </button>
            </div>

            {modal === "approve" ? (
              <p className="text-sm text-slate-700">
                Confirmar aprovação de <strong className="text-slate-900">{active?.file_name || job.title}</strong>? A equipe será notificada imediatamente.
              </p>
            ) : (
              <>
                <p className="text-sm text-slate-700 mb-3">Descreva o ajuste necessário:</p>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FFBC45] focus:border-[#FFBC45]"
                  placeholder="Ex: trocar a cor do título para laranja, reduzir o logo..."
                />
              </>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => setModal(null)}
                disabled={mutation.isPending}
                className="rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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
                className={`rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50 shadow-md ${
                  modal === "approve" ? "bg-[#10B981] hover:bg-[#0EA371]" : "bg-[#F97316] hover:bg-[#EA6A0F]"
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
