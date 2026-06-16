import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
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
  Inbox,
  Receipt,
  AlertTriangle,
  ArrowRight,
  Home,
  Download,
  Image as ImageIcon,
  Folder,
  type LucideIcon,
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

type Proposal = {
  id: string;
  title: string | null;
  total: number;
  monthly_investment: number;
  status: string | null;
  created_at: string;
  accepted_at: string | null;
  public_token: string | null;
  number_display: string | null;
  intro: string | null;
  scope_text: any;
  contract_content: string | null;
  recurring_months: number | null;
};

type Contract = {
  id: string;
  title: string | null;
  total_value: number | null;
  monthly_value: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  payment_method: string | null;
  type: string | null;
  billing_day: number | null;
  contract_content: string | null;
  public_token: string | null;
  number_display: string | null;
};

type ApprovalItem = {
  id: string;
  title: string;
  description: string | null;
  content_type: "image" | "video" | "pdf" | "text";
  content_url: string | null;
  content_text: string | null;
  thumbnail_url: string | null;
  status: "pending" | "approved" | "rejected";
  feedback: string | null;
  sent_for_approval_at: string;
  viewed_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  job_id: string | null;
};

type ApiResponse = {
  client: ClientInfo;
  jobs: JobRow[];
  responsibles: Record<string, { name: string | null; avatar: string | null }>;
  stages: Record<string, StageItem[]>;
  attachments: Record<string, Attachment[]>;
  approvals: Record<string, ApprovalLog[]>;
  invoices: Invoice[];
  proposals: Proposal[];
  currentContract: Contract | null;
  approvalItems: ApprovalItem[];
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
  const [tab, setTab] = useState<"home" | "projects" | "approvals" | "finance" | "docs">("home");

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

  const { client, jobs, responsibles, stages, invoices, proposals, currentContract, approvalItems = [] } = data;
  const displayName = client.company || client.name;

  const pendingApprovals = approvalItems.filter((it) => it.status === "pending");


  // Urgent: overdue OR due in less than 5 days
  const urgentInvoicesCount = (invoices || []).filter((i) => {
    const c = classifyInvoice(i);
    if (c === "paid") return false;
    if (c === "overdue") return true;
    if (!i.due_date) return false;
    const diff = (new Date(i.due_date + "T00:00:00").getTime() - Date.now()) / 86400000;
    return diff < 5;
  }).length;

  const allClear = pendingApprovals.length === 0 && urgentInvoicesCount === 0;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 text-slate-900">
      {/* HERO BANNER */}
      <header className="relative">
        <div
          className="relative h-[160px] md:h-[220px] w-full overflow-hidden"
          style={
            client.portal_cover_url
              ? { backgroundImage: `url(${client.portal_cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { background: "linear-gradient(135deg, #0C1618 0%, #1A2D33 55%, #FFBC45 160%)" }
          }
        >
          {client.portal_cover_url && (
            <div className="absolute inset-0 bg-gradient-to-t from-[#0C1618]/80 via-[#0C1618]/40 to-transparent" />
          )}
          <div className="absolute top-3 right-4 flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-[#FFBC45]">
            <Sparkles className="size-3" />
            Minha Kasa
          </div>
        </div>
        <div className="max-w-3xl md:max-w-6xl mx-auto px-5 sm:px-8">
          <div className="-mt-10 md:-mt-12 flex items-end gap-4">
            {client.logo_url ? (
              <img
                src={client.logo_url}
                alt={displayName}
                className="size-20 md:size-24 rounded-full object-cover border-4 border-white bg-white shadow-lg ring-1 ring-slate-200"
              />
            ) : (
              <div className="size-20 md:size-24 rounded-full flex items-center justify-center text-white text-3xl md:text-4xl font-bold shadow-lg border-4 border-white bg-[#FFBC45]">
                {displayName.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-xl md:text-3xl font-bold tracking-tight text-slate-900 truncate">
                Olá, {client.name.split(" ")[0]} 👋
              </h1>
              <p className="text-xs md:text-sm text-slate-600 font-medium">
                Bem-vindo ao seu portal Kasa
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* QUICK ALERTS */}
      <section className="max-w-3xl md:max-w-6xl mx-auto px-5 sm:px-8 mt-5 md:mt-6">
        {allClear ? (
          <QuickAlert
            tone="success"
            icon={CheckCircle2}
            title="Tudo em dia!"
            subtitle="Nenhum item pendente no momento."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {pendingApprovals.length > 0 && (
              <QuickAlert
                tone="danger"
                icon={AlertCircle}
                emoji="🚨"
                title={`Você tem ${pendingApprovals.length} ${pendingApprovals.length === 1 ? "item aguardando aprovação" : "itens aguardando aprovação"}`}
                subtitle="Toque para revisar agora"
                onClick={() => setTab("approvals")}
              />
            )}
            {urgentInvoicesCount > 0 && (
              <QuickAlert
                tone="warning"
                icon={AlertTriangle}
                emoji="⚠️"
                title={`Você tem ${urgentInvoicesCount} ${urgentInvoicesCount === 1 ? "fatura pendente" : "faturas pendentes"}`}
                subtitle="Vencendo em breve ou vencida"
                onClick={() => setTab("finance")}
              />
            )}
          </div>
        )}
      </section>

      {/* FEED */}
      <main className="max-w-3xl md:max-w-6xl mx-auto px-5 sm:px-8 py-6 space-y-4">
        {tab === "home" ? (
          <HomeSection
            data={data}
            pendingApprovals={pendingApprovals}
            urgentInvoicesCount={urgentInvoicesCount}
            allClear={allClear}
            slug={slug}
            onNavigate={setTab}
          />
        ) : tab === "projects" ? (
          jobs.length === 0 ? (
            <EmptyState icon={Inbox} title="Nenhum projeto liberado no momento." subtitle="Em breve, novidades aparecerão por aqui." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  responsible={job.main_responsible_id ? responsibles[job.main_responsible_id] : null}
                  stages={stages?.[job.id] || []}
                />
              ))}
            </div>
          )
        ) : tab === "approvals" ? (
          pendingApprovals.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Tudo aprovado!"
              subtitle="Não há novas artes ou vídeos para revisar."
            />
          ) : (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-700">
                  📱 Aprovar artes, vídeos e textos
                </h2>
                <p className="text-[11px] text-slate-500 mt-1">
                  {pendingApprovals.length} {pendingApprovals.length === 1 ? "item pendente" : "itens pendentes"}
                </p>
              </div>
              {pendingApprovals.map((item) => (
                <ApprovalFeedCard key={item.id} slug={slug} item={item} />
              ))}
            </div>
          )
        ) : tab === "finance" ? (
          <FinanceSection invoices={invoices || []} />
        ) : (
          <DocsSection proposals={proposals || []} contract={currentContract} />
        )}


        <footer className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-12 pb-6 font-semibold">
          <span className="inline-flex items-center justify-center size-5 rounded-md bg-[#FFBC45] text-white text-[10px] font-black">K</span>
          <span>Powered by <span className="text-slate-700 font-bold">Kasa Marketing</span></span>
        </footer>
      </main>

      {/* TAB BAR */}
      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <div className="max-w-3xl md:max-w-6xl mx-auto grid grid-cols-4">
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
            badge={pendingApprovals.length || undefined}
          />
          <TabButton
            active={tab === "finance"}
            onClick={() => setTab("finance")}
            icon={<Wallet className="size-5" />}
            label="Financeiro"
            dot={urgentInvoicesCount > 0}
          />
          <TabButton
            active={tab === "docs"}
            onClick={() => setTab("docs")}
            icon={<FileText className="size-5" />}
            label="Propostas"
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
  dot,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  dot?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-0.5 py-3 transition-all duration-200 ${
        active ? "text-[#FFBC45]" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      <div className="relative">
        {icon}
        {badge ? (
          <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center bg-[#EF4444] ring-2 ring-white">
            {badge}
          </span>
        ) : dot ? (
          <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-[#EF4444] ring-2 ring-white" />
        ) : null}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider">
        {label}
      </span>
    </button>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <div className="text-center py-20">
      <div className="mx-auto mb-4 flex items-center justify-center size-20 rounded-full bg-slate-100 text-slate-400">
        <Icon className="size-10" strokeWidth={1.5} />
      </div>
      <p className="text-slate-800 font-semibold">{title}</p>
      <p className="text-slate-600 text-sm mt-1">{subtitle}</p>
    </div>
  );
}

function QuickAlert({
  tone,
  icon: Icon,
  emoji,
  title,
  subtitle,
  onClick,
}: {
  tone: "danger" | "warning" | "success";
  icon: LucideIcon;
  emoji?: string;
  title: string;
  subtitle?: string;
  onClick?: () => void;
}) {
  const styles =
    tone === "danger"
      ? "bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100"
      : tone === "warning"
        ? "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100"
        : "bg-emerald-50 border-emerald-200 text-emerald-900";
  const iconStyles =
    tone === "danger"
      ? "bg-rose-500 text-white"
      : tone === "warning"
        ? "bg-amber-500 text-white"
        : "bg-emerald-500 text-white";
  const Wrapper: any = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm transition-all duration-200 ${styles}`}
    >
      <div className={`shrink-0 size-10 rounded-xl flex items-center justify-center shadow-sm ${iconStyles}`}>
        {emoji ? <span className="text-lg leading-none">{emoji}</span> : <Icon className="size-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-tight truncate">{title}</p>
        {subtitle && <p className="text-xs opacity-80 mt-0.5 truncate">{subtitle}</p>}
      </div>
      {onClick && <ArrowRight className="size-4 opacity-60 shrink-0" />}
    </Wrapper>
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

// ============= FEED DE APROVAÇÕES (Instagram-style) =============

function timeAgoPtBR(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return "hoje";
  if (diff < 2 * day) return "ontem";
  const days = Math.floor(diff / day);
  if (days < 30) return `${days} dias atrás`;
  return format(new Date(iso), "dd 'de' MMM", { locale: ptBR });
}

function ApprovalFeedCard({ slug, item }: { slug: string; item: ApprovalItem }) {
  const qc = useQueryClient();
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const mutation = useMutation({
    mutationFn: async (action: "approve" | "reject") => {
      const res = await fetch(`/api/public/portal-approval-action/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: item.id, action, feedback: feedback.trim() || null }),
      });
      if (!res.ok) throw new Error("action_failed");
      return { action };
    },
    onSuccess: ({ action }) => {
      qc.invalidateQueries({ queryKey: ["minha-kasa", slug] });
      if (action === "approve") toast.success("Aprovado! ✅");
      else toast.success("Recusado. Feedback enviado à equipe.");
    },
    onError: () => toast.error("Não foi possível registrar agora. Tente novamente."),
  });

  const typeBadge =
    item.content_type === "image" ? "🖼️"
    : item.content_type === "video" ? "🎬"
    : item.content_type === "pdf" ? "📄"
    : "📝";

  return (
    <article className="bg-white border border-slate-200 rounded-2xl shadow-[0_4px_16px_rgba(15,23,42,0.08)] overflow-hidden">
      {/* HEADER */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-2 text-xs font-semibold text-slate-700 border-b border-slate-100">
        <span className="text-base">{typeBadge}</span>
        <span className="truncate flex-1">{item.title}</span>
        <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-[#FFBC45]/15 text-[#B47A00]">
          Pendente
        </span>
      </div>

      {/* PREVIEW */}
      <div className="bg-slate-900 flex items-center justify-center overflow-hidden">
        {item.content_type === "image" && item.content_url ? (
          <img src={item.content_url} alt={item.title} className="w-full max-h-[70vh] object-contain" />
        ) : item.content_type === "video" && item.content_url ? (
          <video src={item.content_url} controls className="w-full max-h-[70vh] object-contain" />
        ) : item.content_type === "pdf" && item.content_url ? (
          <a
            href={item.content_url}
            target="_blank"
            rel="noreferrer"
            className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-3 text-white hover:text-[#FFBC45]"
          >
            <FileText className="size-16" />
            <span className="text-sm font-bold">Visualizar PDF</span>
            <span className="text-xs text-white/70">Abre em nova aba</span>
          </a>
        ) : item.content_type === "text" && item.content_text ? (
          <div className="w-full bg-white text-slate-900 p-6 max-h-[70vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
            {item.content_text}
          </div>
        ) : (
          <div className="w-full aspect-[4/3] flex items-center justify-center text-white/50 text-sm">
            Conteúdo indisponível
          </div>
        )}
      </div>

      {/* INFO + ACTIONS */}
      <div className="p-5 space-y-4">
        <div>
          {item.description && (
            <p className="text-sm text-slate-700 mb-2">{item.description}</p>
          )}
          <p className="text-[11px] text-slate-500 font-medium">
            📅 Enviado {timeAgoPtBR(item.sent_for_approval_at)}
          </p>
        </div>

        {showFeedback ? (
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            placeholder="💬 Descreva os ajustes necessários..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FFBC45] focus:border-[#FFBC45]"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowFeedback(true)}
            className="text-xs text-slate-600 hover:text-slate-900 font-semibold underline"
          >
            💬 Adicionar feedback (opcional)
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => mutation.mutate("approve")}
            disabled={mutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#10B981] hover:bg-[#0EA371] disabled:opacity-50 text-white font-bold py-3 text-sm transition-colors shadow-md"
          >
            <CheckCircle2 className="size-4" /> Aprovar
          </button>
          <button
            onClick={() => {
              if (!feedback.trim()) setShowFeedback(true);
              mutation.mutate("reject");
            }}
            disabled={mutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-50 text-white font-bold py-3 text-sm transition-colors shadow-md"
          >
            <X className="size-4" /> Recusar
          </button>
        </div>
      </div>
    </article>
  );
}

// ============= FINANCEIRO =============

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

function classifyInvoice(inv: Invoice): "paid" | "overdue" | "pending" {
  const s = (inv.status || "").toLowerCase();
  if (s === "paid" || s === "pago") return "paid";
  if (inv.due_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(inv.due_date + "T00:00:00");
    if (due < today) return "overdue";
  }
  return "pending";
}

function FinanceSection({ invoices }: { invoices: Invoice[] }) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthInvoices = invoices.filter((i) => {
    if (!i.due_date) return false;
    const d = new Date(i.due_date + "T00:00:00");
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthTotal = monthInvoices.reduce((s, i) => s + i.amount, 0);
  const paidTotal = monthInvoices.filter((i) => classifyInvoice(i) === "paid").reduce((s, i) => s + i.amount, 0);
  const pendingTotal = monthInvoices.filter((i) => classifyInvoice(i) === "pending").reduce((s, i) => s + i.amount, 0);
  const overdueTotal = monthInvoices.filter((i) => classifyInvoice(i) === "overdue").reduce((s, i) => s + i.amount, 0);
  const remainingTotal = pendingTotal + overdueTotal;

  // Show: overdue first, then pending sorted by due_date, then paid recent
  const sorted = [...invoices].sort((a, b) => {
    const ca = classifyInvoice(a);
    const cb = classifyInvoice(b);
    const rank = (c: string) => (c === "overdue" ? 0 : c === "pending" ? 1 : 2);
    if (rank(ca) !== rank(cb)) return rank(ca) - rank(cb);
    const da = a.due_date ? new Date(a.due_date).getTime() : 0;
    const db = b.due_date ? new Date(b.due_date).getTime() : 0;
    return da - db;
  });

  return (
    <div className="space-y-4 md:space-y-6">
      {/* RESUMO DO MÊS */}
      <section className="rounded-2xl p-5 sm:p-6 md:p-8 bg-[#0C1618] text-white shadow-[0_8px_24px_rgba(12,22,24,0.25)] border border-[#1A2D33]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-[#FFBC45]">
            <TrendingUp className="size-3.5" />
            Resumo do mês · {format(now, "MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <div className="hidden md:flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#FFBC45] tracking-tight tabular-nums">{fmtBRL(monthTotal)}</span>
            <span className="text-[10px] uppercase tracking-widest text-white/60 font-bold">total faturado</span>
          </div>
        </div>
        <div className="md:hidden mt-2 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-black text-[#FFBC45] tracking-tight">{fmtBRL(monthTotal)}</span>
          <span className="text-xs text-white/60 font-medium">total faturado</span>
        </div>

        <div className="mt-5 md:mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
          <FinanceStat label="✅ Pagas" value={paidTotal} color="#10B981" />
          <FinanceStat label="⏳ Pendentes" value={pendingTotal} color="#FFBC45" />
          <FinanceStat label="🔴 Vencidas" value={overdueTotal} color="#EF4444" />
          <FinanceStat label="💰 Restante" value={remainingTotal} color="#F97316" />
          <FinanceStat label="📊 Total mês" value={monthTotal} color="#FFBC45" />
        </div>
      </section>

      {/* LISTA DE FATURAS */}
      {sorted.length === 0 ? (
        <EmptyState icon={Receipt} title="Nenhuma fatura por aqui." subtitle="Seu financeiro está em dia." />
      ) : (
        <>
          {/* MOBILE: cards */}
          <div className="md:hidden space-y-4">
            {sorted.map((inv) => <InvoiceCard key={inv.id} invoice={inv} />)}
          </div>
          {/* DESKTOP: tabela */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-[0_4px_16px_rgba(15,23,42,0.08)] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800">📋 Faturas</h2>
              <span className="text-xs font-semibold text-slate-600">{sorted.length} {sorted.length === 1 ? "lançamento" : "lançamentos"}</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-widest font-bold text-slate-600">
                <tr>
                  <th className="text-left px-6 py-3">Vencimento</th>
                  <th className="text-left px-6 py-3">Descrição</th>
                  <th className="text-right px-6 py-3">Valor</th>
                  <th className="text-center px-6 py-3">Status</th>
                  <th className="text-right px-6 py-3">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map((inv) => <InvoiceRow key={inv.id} invoice={inv} />)}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function FinanceStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 md:px-4 md:py-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">{label}</div>
      <div className="mt-1 text-sm sm:text-base md:text-lg font-bold tabular-nums" style={{ color }}>
        {fmtBRL(value)}
      </div>
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const state = classifyInvoice(invoice);
  const badge =
    state === "paid"
      ? { cls: "bg-[#10B981] text-white", label: "✅ Pago" }
      : state === "overdue"
        ? { cls: "bg-[#EF4444] text-white", label: "❌ Vencido" }
        : { cls: "bg-[#FFBC45] text-white", label: "💛 Pendente" };

  const dateLabel = invoice.due_date
    ? format(new Date(invoice.due_date + "T00:00:00"), "dd 'de' MMM", { locale: ptBR })
    : "—";

  return (
    <tr className={state === "overdue" ? "bg-rose-50/40" : "hover:bg-slate-50/50 transition-colors"}>
      <td className="px-6 py-4 align-top">
        <div className="text-sm font-bold text-slate-900 tabular-nums">{dateLabel}</div>
        {state === "paid" && invoice.payment_date && (
          <div className="text-[11px] text-[#10B981] font-semibold mt-0.5">
            Pago em {format(new Date(invoice.payment_date + "T00:00:00"), "dd/MM", { locale: ptBR })}
          </div>
        )}
      </td>
      <td className="px-6 py-4 align-top">
        <div className="font-semibold text-slate-900">{invoice.description || "Fatura"}</div>
      </td>
      <td className="px-6 py-4 align-top text-right">
        <span className="font-black text-slate-900 tabular-nums text-base">{fmtBRL(invoice.amount)}</span>
      </td>
      <td className="px-6 py-4 align-top text-center">
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-sm inline-flex ${badge.cls}`}>
          {badge.label}
        </span>
      </td>
      <td className="px-6 py-4 align-top text-right">
        {state !== "paid" ? (
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.alert("Em breve: pagamento online. Por enquanto, entre em contato com sua gestora.");
              }
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors ${
              state === "overdue" ? "bg-[#EF4444] hover:bg-[#DC2626]" : "bg-[#FFBC45] hover:bg-[#E5A93E]"
            }`}
          >
            🔗 Pagar
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#10B981]">
            <CheckCircle2 className="size-3.5" />
            Quitada
          </span>
        )}
      </td>
    </tr>
  );
}

function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const state = classifyInvoice(invoice);
  const badge =
    state === "paid"
      ? { cls: "bg-[#10B981] text-white", label: "✅ Pago" }
      : state === "overdue"
        ? { cls: "bg-[#EF4444] text-white", label: "❌ Vencido" }
        : { cls: "bg-[#FFBC45] text-white", label: "💛 Pendente" };

  return (
    <article
      className={`bg-white rounded-2xl shadow-[0_4px_16px_rgba(15,23,42,0.08)] border overflow-hidden ${
        state === "overdue" ? "border-[#EF4444]/40 ring-1 ring-[#EF4444]/20" : "border-slate-200"
      }`}
    >
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-base leading-tight truncate">
              {invoice.description || "Fatura"}
            </h3>
            {invoice.due_date && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Calendar className="size-3.5" />
                {state === "overdue" ? (
                  <span className="text-[#EF4444] inline-flex items-center gap-1">
                    <AlertCircle className="size-3.5" />
                    Vencida em {format(new Date(invoice.due_date + "T00:00:00"), "dd 'de' MMM", { locale: ptBR })}
                  </span>
                ) : state === "paid" && invoice.payment_date ? (
                  <span className="text-[#10B981]">
                    Paga em {format(new Date(invoice.payment_date + "T00:00:00"), "dd 'de' MMM", { locale: ptBR })}
                  </span>
                ) : (
                  <span>
                    Vence em {format(new Date(invoice.due_date + "T00:00:00"), "dd 'de' MMM", { locale: ptBR })}
                  </span>
                )}
              </div>
            )}
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-sm ${badge.cls}`}>
            {badge.label}
          </span>
        </div>

        <div className="flex items-end justify-between gap-3 pt-2 border-t border-slate-100">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-600">Valor</div>
            <div className="text-2xl font-black text-slate-900 tabular-nums leading-tight">{fmtBRL(invoice.amount)}</div>
          </div>
          {state !== "paid" && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.alert("Em breve: pagamento online. Por enquanto, entre em contato com sua gestora.");
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-md transition-colors ${
                state === "overdue" ? "bg-[#EF4444] hover:bg-[#DC2626]" : "bg-[#FFBC45] hover:bg-[#E5A93E]"
              }`}
            >
              🔗 Pagar Agora
            </button>
          )}
          {state === "paid" && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#10B981]">
              <CheckCircle2 className="size-4" />
              Quitada
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

// ============= PROPOSTAS & CONTRATOS =============

function renderScopeText(scope: any): string {
  if (!scope) return "";
  if (typeof scope === "string") return scope;
  if (Array.isArray(scope)) {
    return scope
      .map((s) => (typeof s === "string" ? `• ${s}` : `• ${s?.text || JSON.stringify(s)}`))
      .join("\n");
  }
  try {
    return JSON.stringify(scope, null, 2);
  } catch {
    return "";
  }
}

function DocsSection({ proposals, contract }: { proposals: Proposal[]; contract: Contract | null }) {
  const [viewing, setViewing] = useState<
    | { kind: "proposal"; data: Proposal }
    | { kind: "contract"; data: Contract }
    | null
  >(null);

  return (
    <div className="space-y-5">
      {/* PROPOSTAS */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-700 px-1">
          📄 Propostas Aprovadas
        </h2>
        {proposals.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-600 text-sm">
            Nenhuma proposta aprovada no momento.
          </div>
        ) : (
          proposals.map((p) => (
            <article
              key={p.id}
              className="bg-white border border-slate-200 rounded-2xl shadow-[0_4px_16px_rgba(15,23,42,0.08)] p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  {p.number_display && (
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">
                      {p.number_display}
                    </div>
                  )}
                  <h3 className="font-bold text-base sm:text-lg text-slate-900 leading-tight">
                    {p.title || "Proposta"}
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#10B981] text-white shadow-sm whitespace-nowrap">
                  ✅ Aprovada
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-4">
                <div className="text-xl sm:text-2xl font-black tabular-nums text-[#FFBC45]">
                  {fmtBRL(p.total || p.monthly_investment)}
                </div>
                {p.monthly_investment > 0 && p.total !== p.monthly_investment && (
                  <div className="text-xs font-semibold text-slate-700">
                    {fmtBRL(p.monthly_investment)}/mês
                  </div>
                )}
                <div className="text-xs text-slate-600 inline-flex items-center gap-1 font-medium">
                  <Calendar className="size-3.5 text-[#FFBC45]" />
                  {format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setViewing({ kind: "proposal", data: p })}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFBC45] hover:bg-[#FFAA20] text-[#0C1618] font-bold py-2.5 text-sm transition-colors shadow-md"
                >
                  📄 Visualizar
                </button>
                {p.public_token ? (
                  <a
                    href={`/proposta/${p.public_token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#0C1618] text-[#0C1618] hover:bg-[#0C1618] hover:text-white font-bold py-2.5 text-sm transition-colors"
                  >
                    ⬇ Baixar PDF
                  </a>
                ) : (
                  <button
                    disabled
                    className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 text-slate-400 font-bold py-2.5 text-sm cursor-not-allowed"
                  >
                    ⬇ Baixar PDF
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </section>

      {/* CONTRATO VIGENTE */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-700 px-1">
          📜 Contrato Vigente
        </h2>
        {!contract ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-600 text-sm">
            Nenhum contrato vigente no momento.
          </div>
        ) : (
          <article
            className="rounded-2xl p-5 sm:p-6 shadow-[0_8px_24px_rgba(12,22,24,0.25)]"
            style={{
              background: "linear-gradient(135deg, #0C1618 0%, #1A2D33 100%)",
              border: "2px solid #FFBC45",
            }}
          >
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#FFBC45] mb-2">
              <Sparkles className="size-3" /> Contrato Ativo
            </div>
            <h3 className="font-bold text-lg sm:text-xl text-white leading-tight mb-3">
              {contract.title || "Contrato de Prestação de Serviços"}
            </h3>

            <div className="space-y-2 mb-5 text-sm">
              {(contract.start_date || contract.end_date) && (
                <div className="flex items-center gap-2 text-white/90">
                  <Calendar className="size-4 text-[#FFBC45]" />
                  <span className="font-medium">
                    {contract.start_date ? format(new Date(contract.start_date + "T00:00:00"), "dd/MM/yyyy") : "—"}
                    {" → "}
                    {contract.end_date ? format(new Date(contract.end_date + "T00:00:00"), "dd/MM/yyyy") : "Indeterminado"}
                  </span>
                </div>
              )}
              {contract.monthly_value ? (
                <div className="text-white">
                  <span className="text-2xl font-black tabular-nums text-[#FFBC45]">
                    {fmtBRL(contract.monthly_value)}
                  </span>
                  <span className="text-xs font-semibold text-white/80 ml-1">/mês</span>
                </div>
              ) : contract.total_value ? (
                <div className="text-white">
                  <span className="text-2xl font-black tabular-nums text-[#FFBC45]">
                    {fmtBRL(contract.total_value)}
                  </span>
                  <span className="text-xs font-semibold text-white/80 ml-1">total</span>
                </div>
              ) : null}
              {contract.billing_day && (
                <div className="text-xs text-white/70 font-medium">
                  Faturamento todo dia {contract.billing_day}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setViewing({ kind: "contract", data: contract })}
                disabled={!contract.contract_content}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFBC45] hover:bg-[#FFAA20] disabled:opacity-50 disabled:cursor-not-allowed text-[#0C1618] font-bold py-2.5 text-sm transition-colors shadow-md"
              >
                👁 Visualizar
              </button>
              {contract.public_token ? (
                <a
                  href={`/proposta/${contract.public_token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#FFBC45] text-[#FFBC45] hover:bg-[#FFBC45] hover:text-[#0C1618] font-bold py-2.5 text-sm transition-colors"
                >
                  ⬇ Baixar PDF
                </a>
              ) : (
                <button
                  disabled
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/20 text-white/40 font-bold py-2.5 text-sm cursor-not-allowed"
                >
                  ⬇ Baixar PDF
                </button>
              )}
            </div>
          </article>
        )}
      </section>

      {viewing && <DocViewerModal item={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function DocViewerModal({
  item,
  onClose,
}: {
  item:
    | { kind: "proposal"; data: Proposal }
    | { kind: "contract"; data: Contract };
  onClose: () => void;
}) {
  const isProposal = item.kind === "proposal";
  const title = isProposal
    ? item.data.title || "Proposta"
    : item.data.title || "Contrato";
  const subtitle = isProposal
    ? item.data.number_display || ""
    : "Contrato Vigente";
  const publicToken = item.data.public_token;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-screen sm:max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-[#0C1618]">
          <div className="min-w-0">
            {subtitle && (
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#FFBC45]">
                {subtitle}
              </div>
            )}
            <h3 className="font-bold text-base sm:text-lg text-white truncate">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 size-9 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 bg-white">
          {isProposal ? (
            <ProposalContent p={item.data} />
          ) : item.data.contract_content ? (
            <div
              className="prose prose-sm sm:prose max-w-none text-slate-900 prose-headings:text-slate-900 prose-strong:text-slate-900"
              dangerouslySetInnerHTML={{ __html: item.data.contract_content }}
            />
          ) : (
            <p className="text-slate-600 text-sm">Conteúdo do contrato indisponível.</p>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-4 border-t border-slate-200 bg-white">
          {publicToken ? (
            <a
              href={`/proposta/${publicToken}`}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFBC45] hover:bg-[#FFAA20] text-[#0C1618] font-bold py-3 text-sm transition-colors shadow-md"
            >
              ⬇ Baixar PDF
            </a>
          ) : (
            <button
              onClick={() => window.print()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFBC45] hover:bg-[#FFAA20] text-[#0C1618] font-bold py-3 text-sm transition-colors shadow-md"
            >
              ⬇ Baixar PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProposalContent({ p }: { p: Proposal }) {
  const scopeText = renderScopeText(p.scope_text);
  return (
    <div className="space-y-5 text-slate-900">
      <div>
        <h1 className="text-2xl font-black text-slate-900 leading-tight">{p.title}</h1>
        <p className="text-xs text-slate-600 mt-1 font-medium">
          Criada em {format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}
          {p.accepted_at &&
            ` · Aprovada em ${format(new Date(p.accepted_at), "dd/MM/yyyy")}`}
        </p>
      </div>

      {p.intro && (
        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{p.intro}</div>
      )}

      {scopeText && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-2">
            Escopo
          </h2>
          <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-4">
            {scopeText}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {p.total > 0 && (
          <div className="rounded-xl border border-slate-200 p-4 bg-white">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
              Valor total
            </div>
            <div className="text-2xl font-black tabular-nums text-[#FFBC45] mt-1">
              {fmtBRL(p.total)}
            </div>
          </div>
        )}
        {p.monthly_investment > 0 && (
          <div className="rounded-xl border border-slate-200 p-4 bg-white">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
              Investimento mensal
            </div>
            <div className="text-2xl font-black tabular-nums text-[#FFBC45] mt-1">
              {fmtBRL(p.monthly_investment)}
            </div>
            {p.recurring_months ? (
              <div className="text-xs text-slate-600 mt-0.5 font-medium">
                por {p.recurring_months} {p.recurring_months === 1 ? "mês" : "meses"}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
