import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";

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
  Sun,
  Moon,
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
  portal_primary_color: string | null;
  portal_cover_color: string | null;
  created_at?: string | null;
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

type ApprovalSlide = {
  id: string;
  url: string;
  mime_type?: string | null;
  thumbnail_url?: string | null;
  kind?: "image" | "video";
};

type ApprovalItemComment = {
  id: string;
  approval_item_id: string;
  slide_id: string | null;
  author_type: "client" | "team";
  author_name: string | null;
  body: string;
  is_change_request: boolean;
  created_at: string;
};

type ApprovalItem = {
  id: string;
  title: string;
  description: string | null;
  content_type: "image" | "video" | "pdf" | "text";
  content_url: string | null;
  content_text: string | null;
  caption: string | null;
  thumbnail_url: string | null;
  status: "pending" | "approved" | "rejected";
  feedback: string | null;
  sent_for_approval_at: string;
  viewed_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  job_id: string | null;
  format?: "single" | "carousel" | "story";
  slides?: ApprovalSlide[];
  slide_statuses?: Record<string, "pending" | "approved" | "rejected">;
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
  approvalComments?: Record<string, ApprovalItemComment[]>;
  events?: CalendarEventRow[];
};

type CalendarEventRow = {
  id: string;
  title: string;
  description: string | null;
  kind: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean | null;
  color: string | null;
};

// High-contrast status pills: solid colored bg + white text
const STATUS_MAP: Record<string, { emoji: string; label: string; cls: string }> = {
  not_started: { emoji: "📥", label: "Novas Demandas", cls: "bg-[#9CA3AF] text-white border-[#9CA3AF]" },
  in_progress: { emoji: "⚙️", label: "Em Andamento", cls: "bg-[#3B82F6] text-white border-[#3B82F6]" },
  review: { emoji: "🔍", label: "Em Revisão", cls: "bg-[var(--portal-primary)] text-white border-[var(--portal-primary)]" },
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
  const themeStorageKey = `kasa.minha-kasa.theme.${slug}`;
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(themeStorageKey);
      if (saved === "dark" || saved === "light") setTheme(saved);
    } catch { /* noop */ }
  }, [themeStorageKey]);
  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try { window.localStorage.setItem(themeStorageKey, next); } catch { /* noop */ }
      return next;
    });
  };


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

  const { client, jobs, responsibles, stages, invoices, proposals, currentContract, approvalItems = [], approvalComments = {} } = data;
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

  const clientSince = client.created_at
    ? format(new Date(client.created_at), "MMMM 'de' yyyy", { locale: ptBR })
    : null;

  const tabs: Array<{ key: typeof tab; label: string; icon: LucideIcon; badge?: number; dot?: boolean }> = [
    { key: "home", label: "Início", icon: Home },
    { key: "projects", label: "Projetos", icon: LayoutGrid },
    { key: "approvals", label: "Aprovações", icon: CheckSquare, badge: pendingApprovals.length || undefined },
    { key: "finance", label: "Financeiro", icon: Wallet, dot: urgentInvoicesCount > 0 },
    { key: "docs", label: "Propostas", icon: FileText },
  ];

  // White-label theming: per-client portal colors with sensible defaults.
  const primary = (client.portal_primary_color || "").trim() || "#FFBC45";
  const coverColor = (client.portal_cover_color || "").trim() || "#1A1A2E";
  // Build derived shades + cover gradient from the chosen colors.
  const portalThemeVars = {
    "--portal-primary": primary,
    "--portal-primary-5": `color-mix(in oklab, ${primary} 5%, transparent)`,
    "--portal-primary-10": `color-mix(in oklab, ${primary} 10%, transparent)`,
    "--portal-primary-15": `color-mix(in oklab, ${primary} 15%, transparent)`,
    "--portal-primary-30": `color-mix(in oklab, ${primary} 30%, transparent)`,
    "--portal-primary-dark": `color-mix(in oklab, ${primary} 75%, black)`,
    "--portal-primary-hover": `color-mix(in oklab, ${primary} 88%, black)`,
    "--portal-cover": coverColor,
  } as React.CSSProperties;
  const coverGradient = `linear-gradient(135deg, color-mix(in oklab, ${coverColor} 92%, black) 0%, ${coverColor} 60%, color-mix(in oklab, ${coverColor} 85%, ${primary}) 100%)`;

  const isDark = theme === "dark";

  return (
    <div
      data-mk-theme={theme}
      className="min-h-screen pb-12"
      style={{ ...portalThemeVars, background: isDark ? "#0b0f1a" : "#F0F2F5", color: isDark ? "#e2e8f0" : "#0f172a" }}
    >
      <MinhaKasaDarkStyles />
      <div className="max-w-[960px] lg:max-w-[1440px] mx-auto px-0 md:px-4 lg:px-8 pt-0 md:pt-5">
        {/* HEADER — cover + profile info as independent blocks (no clipping card) */}
        <div className="relative">
          {/* 1. COVER — full width, only top rounded, no overflow clipping */}
          <div
            className="relative h-[140px] sm:h-[180px] md:h-[220px] w-full md:rounded-t-xl overflow-hidden shadow-sm"
            style={
              client.portal_cover_url
                ? { backgroundImage: `url(${client.portal_cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                : { background: coverGradient }
            }
          >

            {!client.portal_cover_url && (
              <>
                <div
                  className="absolute inset-0 opacity-[0.12]"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(45deg, var(--portal-primary) 0, var(--portal-primary) 1px, transparent 1px, transparent 22px), repeating-linear-gradient(-45deg, var(--portal-primary) 0, var(--portal-primary) 1px, transparent 1px, transparent 22px)",
                  }}
                />
                <div className="absolute top-4 right-12 size-40 rounded-full bg-[var(--portal-primary-15)] blur-3xl" />
                <div className="absolute bottom-4 left-12 size-48 rounded-full bg-[var(--portal-primary-10)] blur-3xl" />
              </>
            )}
            <div className="absolute top-3 right-4 z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
                title={isDark ? "Tema claro" : "Tema escuro"}
                className="inline-flex items-center justify-center size-7 rounded-full bg-black/30 hover:bg-black/45 backdrop-blur text-white border border-white/20 transition-colors"
              >
                {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              </button>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-[var(--portal-primary)]">
                <Sparkles className="size-3" />
                Minha Kasa
              </div>
            </div>
          </div>


          {/* 2. AVATAR — overflows the cover, half above / half below */}
          <div className="relative h-0">
            <div className="absolute left-5 md:left-8 -translate-y-1/2 z-20 md:block hidden">
              {client.logo_url ? (
                <img
                  src={client.logo_url}
                  alt={displayName}
                  className="size-32 rounded-full object-cover border-4 border-white bg-white shadow-lg"
                />
              ) : (
                <div className="size-32 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg border-4 border-white bg-gradient-to-br from-[var(--portal-primary)] to-[var(--portal-primary-dark)]">
                  {displayName.charAt(0)}
                </div>
              )}
            </div>
            {/* Mobile avatar — centered, overlapping the cover */}
            <div className="md:hidden absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              {client.logo_url ? (
                <img
                  src={client.logo_url}
                  alt={displayName}
                  className="size-24 rounded-full object-cover border-4 border-white bg-white shadow-lg"
                />
              ) : (
                <div className="size-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg border-4 border-white bg-gradient-to-br from-[var(--portal-primary)] to-[var(--portal-primary-dark)]">
                  {displayName.charAt(0)}
                </div>
              )}
            </div>
          </div>

          {/* 3. PROFILE INFO — desktop: ao lado do avatar; mobile: centralizado abaixo */}
          <div className="bg-white md:rounded-b-xl shadow-sm">
            <div className="px-5 md:px-8 pt-16 md:pt-4 md:pl-[168px] pb-4 md:pb-5">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 truncate text-center md:text-left">
                {displayName}
              </h1>
              {clientSince && (
                <p className="text-[13px] md:text-sm text-slate-500 font-medium mt-0.5 capitalize text-center md:text-left">
                  Cliente desde {clientSince}
                </p>
              )}
            </div>

            {/* 4. TAB BAR */}
            <div className="border-t border-slate-200">
              <div className="flex overflow-x-auto no-scrollbar px-2 md:px-4">
                {tabs.map((t) => (
                  <FbTabButton
                    key={t.key}
                    active={tab === t.key}
                    onClick={() => setTab(t.key)}
                    icon={<t.icon className="size-4" />}
                    label={t.label}
                    badge={t.badge}
                    dot={t.dot}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>


        {/* QUICK ALERTS — only when there is something pending (big "TUDO VERDE" hero covers the all-clear case) */}
        {!allClear && (
          <section className="px-4 md:px-0 mt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <QuickAlert
                tone="success"
                icon={CheckCircle2}
                title="Projetos em dia"
                subtitle="Sua operação está fluindo."
              />
              {pendingApprovals.length > 0 && (
                <QuickAlert
                  tone="danger"
                  icon={AlertCircle}
                  emoji="🚨"
                  title={`${pendingApprovals.length} ${pendingApprovals.length === 1 ? "item aguardando aprovação" : "itens aguardando aprovação"}`}
                  subtitle="Toque para revisar agora"
                  onClick={() => setTab("approvals")}
                />
              )}
              {urgentInvoicesCount > 0 && (
                <QuickAlert
                  tone="warning"
                  icon={AlertTriangle}
                  emoji="⚠️"
                  title={`${urgentInvoicesCount} ${urgentInvoicesCount === 1 ? "fatura pendente" : "faturas pendentes"}`}
                  subtitle="Vencendo em breve ou vencida"
                  onClick={() => setTab("finance")}
                />
              )}
            </div>
          </section>
        )}


        {/* FEED */}
        <main className="px-4 md:px-0 py-4 space-y-4">
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
            <ApprovalsInstagramSection
              slug={slug}
              client={client}
              items={approvalItems}
              commentsByItem={approvalComments}
            />

          ) : tab === "finance" ? (
            <FinanceSection invoices={invoices || []} />
          ) : (
            <DocsSection proposals={proposals || []} contract={currentContract} />
          )}

          <footer className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-8 pb-4 font-semibold">
            <span className="inline-flex items-center justify-center size-5 rounded-md bg-[var(--portal-primary)] text-white text-[10px] font-black">K</span>
            <span>Powered by <span className="text-slate-700 font-bold">Kasa Marketing</span></span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function FbTabButton({
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
      className={`relative shrink-0 flex items-center justify-center gap-2 px-4 md:px-5 py-3 md:py-3.5 text-[13px] md:text-sm font-semibold transition-all duration-200 border-b-[3px] -mb-px ${
        active
          ? "text-[#9A6A00] border-[var(--portal-primary)]"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-transparent"
      }`}
    >
      <span className={active ? "text-[var(--portal-primary)]" : "text-slate-500"}>{icon}</span>
      <span>{label}</span>
      {badge ? (
        <span className="inline-flex min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold text-white items-center justify-center bg-[#EF4444]">
          {badge}
        </span>
      ) : dot ? (
        <span className="size-2 rounded-full bg-[#EF4444]" />
      ) : null}
    </button>
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
        active ? "text-[var(--portal-primary)]" : "text-slate-600 hover:text-slate-900"
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
              <Calendar className="size-3.5 text-[var(--portal-primary)]" />
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
              className="h-full rounded-full bg-gradient-to-r from-[var(--portal-primary)] to-[var(--portal-primary-dark)] transition-all"
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
                <ListChecks className="size-3.5 text-[var(--portal-primary)]" />
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
                        <Clock className="size-4 shrink-0 text-[var(--portal-primary)]" />
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
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--portal-primary)] text-white shadow-sm">
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
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-[var(--portal-primary)] transition-colors"
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
              className="flex flex-col items-center gap-2 text-white hover:text-[var(--portal-primary)]"
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
                i === activeIdx ? "border-[var(--portal-primary)] scale-105" : "border-slate-200 opacity-70 hover:opacity-100"
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--portal-primary)] focus:border-[var(--portal-primary)]"
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


// ============= APROVAÇÕES — ESTILO INSTAGRAM =============

function approvalFormatLabel(item: ApprovalItem): string {
  // Try to infer a short format label from the title; fall back to content type.
  const t = (item.title || "").toLowerCase();
  if (/(reels?|tiktok|short)/.test(t)) return "Reels";
  if (/story|stories/.test(t)) return "Story";
  if (/carrossel|carousel/.test(t)) return "Carrossel";
  if (/feed|post/.test(t)) return "Post Feed";
  if (item.content_type === "video") return "Vídeo";
  if (item.content_type === "pdf") return "PDF";
  if (item.content_type === "text") return "Legenda";
  return "Post";
}

function ApprovalsInstagramSection({
  slug,
  client,
  items,
  commentsByItem,
}: {
  slug: string;
  client: ClientInfo;
  items: ApprovalItem[];
  commentsByItem: Record<string, ApprovalItemComment[]>;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [visible, setVisible] = useState(12);

  const displayName = client.company || client.name;
  const approved = items.filter((i) => i.status === "approved").length;
  const pending = items.filter((i) => i.status === "pending").length;
  const rejected = items.filter((i) => i.status === "rejected").length;

  const filtered = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      // Pending first, then most recent
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return new Date(b.sent_for_approval_at).getTime() - new Date(a.sent_for_approval_at).getTime();
    });
    if (filter === "all") return sorted;
    return sorted.filter((i) => i.status === filter);
  }, [items, filter]);

  const shown = filtered.slice(0, visible);
  const hasMore = filtered.length > visible;

  // Infinite scroll sentinel
  useEffect(() => {
    if (!hasMore) return;
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 600) {
        setVisible((v) => v + 12);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hasMore]);

  const activeItem = activeId ? items.find((i) => i.id === activeId) || null : null;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Ainda não há artes para revisar."
        subtitle="Quando sua equipe enviar artes, vídeos ou legendas, eles aparecerão aqui."
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* INSTAGRAM-STYLE PROFILE HEADER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-5 md:gap-8">
          {/* Avatar */}
          <div className="shrink-0">
            {client.logo_url ? (
              <img
                src={client.logo_url}
                alt={displayName}
                className="size-20 md:size-24 rounded-full object-cover border-2 border-slate-200 bg-white"
              />
            ) : (
              <div className="size-20 md:size-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-2 border-slate-200 bg-gradient-to-br from-[var(--portal-primary)] to-[var(--portal-primary-dark)]">
                {displayName.charAt(0)}
              </div>
            )}
          </div>

          {/* Info + stats */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h2 className="font-bold text-lg md:text-xl text-slate-900 truncate">{displayName}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-600 font-medium mb-2">
              <span><b className="text-slate-900">{approved}</b> Aprovadas</span>
              <span className="text-slate-300">•</span>
              <span><b className="text-slate-900">{pending}</b> Pendentes</span>
              <span className="text-slate-300">•</span>
              <span><b className="text-slate-900">{rejected}</b> Ajustes</span>
            </div>
            <p className="text-[13px] text-slate-700">
              <span className="font-semibold">Campanhas ativas</span>
              <span className="text-slate-400"> • </span>
              <span>Marketing Digital</span>
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mt-5 -mx-5 md:-mx-6 border-t border-slate-200">
          <div className="flex justify-around text-[11px] font-bold uppercase tracking-wider">
            {([
              { k: "all", label: `Tudo (${items.length})` },
              { k: "pending", label: `⏳ Pendentes (${pending})` },
              { k: "approved", label: `✅ Aprovadas (${approved})` },
              { k: "rejected", label: `✏️ Ajustes (${rejected})` },
            ] as const).map((f) => {
              const active = filter === f.k;
              return (
                <button
                  key={f.k}
                  type="button"
                  onClick={() => { setFilter(f.k); setVisible(12); }}
                  className={`flex-1 py-3 px-2 border-t-2 transition-colors ${
                    active
                      ? "border-slate-900 text-slate-900"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* INSTAGRAM GRID — 3 columns, 4px gap */}
      <div className="mt-3 md:mt-4 grid grid-cols-3 gap-1">
        {shown.map((item) => (
          <ApprovalGridTile
            key={item.id}
            item={item}
            onClick={() => setActiveId(item.id)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-sm text-slate-500">
          Nenhum item neste filtro.
        </div>
      )}

      {hasMore && (
        <div className="text-center py-6 text-xs text-slate-400">
          Carregando mais…
        </div>
      )}

      {/* MODAL */}
      {activeItem && (
        <ApprovalFullscreenModal
          slug={slug}
          item={activeItem}
          comments={commentsByItem[activeItem.id] || []}
          onClose={() => setActiveId(null)}
        />
      )}
    </div>
  );
}

function ApprovalGridTile({ item, onClick }: { item: ApprovalItem; onClick: () => void }) {
  const isImg = item.content_type === "image" && item.content_url;
  const isVid = item.content_type === "video" && item.content_url;

  const badge =
    item.status === "approved"
      ? { emoji: "✅", cls: "bg-emerald-500 text-white", title: "Aprovada" }
      : item.status === "rejected"
      ? { emoji: "✏️", cls: "bg-amber-400 text-amber-950", title: "Ajuste solicitado" }
      : { emoji: "⏳", cls: "bg-orange-500 text-white", title: "Pendente" };

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block aspect-square w-full overflow-hidden bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--portal-primary)] focus:z-10"
      title={item.title}
    >
      {isImg ? (
        <img
          src={item.thumbnail_url || item.content_url!}
          alt={item.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : isVid ? (
        <>
          {item.thumbnail_url ? (
            <img
              src={item.thumbnail_url}
              alt={item.title}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <video
              src={item.content_url!}
              muted
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-10 rounded-full bg-black/45 backdrop-blur flex items-center justify-center text-white">
              <Play className="size-5 fill-current" />
            </div>
          </div>
        </>
      ) : item.content_type === "pdf" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 gap-1.5">
          <FileText className="size-8" />
          <span className="text-[10px] font-bold uppercase tracking-wider">PDF</span>
        </div>
      ) : (
        <div className="absolute inset-0 p-3 bg-white text-slate-800 text-[10px] leading-tight overflow-hidden">
          <div className="font-bold uppercase tracking-wider text-[9px] text-slate-400 mb-1">📝 Legenda</div>
          <p className="line-clamp-[9] whitespace-pre-wrap">{item.content_text || item.caption || item.title}</p>
        </div>
      )}

      {/* Status badge */}
      <div
        className={`absolute top-1.5 right-1.5 z-10 inline-flex items-center justify-center size-6 rounded-full text-[11px] font-bold shadow-md ${badge.cls}`}
        title={badge.title}
      >
        {badge.emoji}
      </div>

      {/* Label overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent">
        <p className="text-[10px] md:text-[11px] font-bold text-white truncate leading-tight">
          {approvalFormatLabel(item)}
        </p>
      </div>
    </button>
  );
}

function ApprovalFullscreenModal({
  slug,
  item,
  onClose,
}: {
  slug: string;
  item: ApprovalItem;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

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
      if (action === "approve") {
        toast.success("Aprovado! ✅");
        onClose();
      } else {
        toast.success("Ajuste enviado! A equipe vai revisar.");
        setShowFeedback(false);
        setFeedback("");
        onClose();
      }
    },
    onError: () => toast.error("Não foi possível registrar agora. Tente novamente."),
  });

  const isPending = item.status === "pending";

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-stretch sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-md sm:rounded-2xl bg-black overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
          <div className="text-white min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider opacity-80">{approvalFormatLabel(item)}</p>
            <p className="text-sm font-semibold truncate">{item.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 inline-flex items-center justify-center size-9 rounded-full bg-white/15 hover:bg-white/25 text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Media */}
        <div className="flex-1 flex items-center justify-center overflow-auto bg-black">
          {item.content_type === "image" && item.content_url ? (
            <img src={item.content_url} alt={item.title} className="w-full h-full object-contain" />
          ) : item.content_type === "video" && item.content_url ? (
            <video src={item.content_url} controls autoPlay className="w-full h-full object-contain" />
          ) : item.content_type === "pdf" && item.content_url ? (
            <a
              href={item.content_url}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center gap-3 text-white hover:text-[var(--portal-primary)] p-10"
            >
              <FileText className="size-20" />
              <span className="text-base font-bold">Abrir PDF</span>
              <span className="text-xs text-white/60">Abre em nova aba</span>
            </a>
          ) : item.content_type === "text" && item.content_text ? (
            <div className="w-full max-h-full overflow-y-auto bg-white text-slate-900 p-6 whitespace-pre-wrap text-sm leading-relaxed">
              {item.content_text}
            </div>
          ) : (
            <div className="text-white/60 text-sm">Conteúdo indisponível</div>
          )}
        </div>

        {/* Caption */}
        {item.caption && (
          <div className="px-4 py-3 bg-black/85 border-t border-white/10 max-h-32 overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">📝 Legenda</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(item.caption || "").then(
                    () => toast.success("Legenda copiada!"),
                    () => toast.error("Não foi possível copiar."),
                  );
                }}
                className="text-[11px] font-bold text-[var(--portal-primary)] hover:opacity-80"
              >
                📋 Copiar
              </button>
            </div>
            <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-white/90 font-mono">
              {item.caption}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white p-4 space-y-3">
          {!isPending ? (
            <div className="text-center text-sm font-semibold text-slate-600 py-2">
              {item.status === "approved" ? "✅ Já aprovada" : "✏️ Ajuste já solicitado"}
            </div>
          ) : !showFeedback ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => mutation.mutate("approve")}
                disabled={mutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#10B981] hover:bg-[#0EA371] disabled:opacity-50 text-white font-bold py-3 text-sm shadow-md"
              >
                <CheckCircle2 className="size-4" /> APROVAR
              </button>
              <button
                onClick={() => setShowFeedback(true)}
                disabled={mutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--portal-primary)] hover:bg-[var(--portal-primary-hover)] disabled:opacity-50 text-slate-900 font-bold py-3 text-sm shadow-md"
              >
                ✏️ AJUSTAR
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-800">
                ✏️ O que precisa ser ajustado?
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                autoFocus
                placeholder="Descreva os ajustes necessários..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--portal-primary)]"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (!feedback.trim()) {
                      toast.error("Descreva o ajuste antes de enviar.");
                      return;
                    }
                    mutation.mutate("reject");
                  }}
                  disabled={mutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-50 text-white font-bold py-3 text-sm shadow-md"
                >
                  ⬆️ Enviar Ajuste
                </button>
                <button
                  onClick={() => { setShowFeedback(false); setFeedback(""); }}
                  disabled={mutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold py-3 text-sm"
                >
                  ↩️ Voltar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
        <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-[var(--portal-primary-15)] text-[#B47A00]">
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
            className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-3 text-white hover:text-[var(--portal-primary)]"
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

      {/* CAPTION (legenda do post) */}
      {item.caption && (
        <div className="px-5 pt-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                📝 Legenda do post
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(item.caption || "").then(
                    () => toast.success("Legenda copiada!"),
                    () => toast.error("Não foi possível copiar."),
                  );
                }}
                className="text-[11px] font-bold text-[var(--portal-primary)] hover:text-[var(--portal-primary-hover)]"
              >
                📋 Copiar
              </button>
            </div>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800 font-mono">
              {item.caption}
            </p>
          </div>
        </div>
      )}

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


        {!showFeedback ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => mutation.mutate("approve")}
              disabled={mutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#10B981] hover:bg-[#0EA371] disabled:opacity-50 text-white font-bold py-3 text-sm transition-colors shadow-md"
            >
              <CheckCircle2 className="size-4" /> Aprovar
            </button>
            <button
              onClick={() => setShowFeedback(true)}
              disabled={mutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--portal-primary)] hover:bg-[var(--portal-primary-hover)] disabled:opacity-50 text-slate-900 font-bold py-3 text-sm transition-colors shadow-md"
            >
              ✏️ Ajustar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-800">
              ✏️ O que precisa ser ajustado?
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              autoFocus
              placeholder="Descreva os ajustes necessários..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--portal-primary)] focus:border-[var(--portal-primary)]"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (!feedback.trim()) {
                    toast.error("Descreva o ajuste antes de enviar.");
                    return;
                  }
                  mutation.mutate("reject", {
                    onSuccess: () => {
                      toast.success("Ajuste enviado! A equipe vai revisar.");
                      setShowFeedback(false);
                      setFeedback("");
                    },
                  });
                }}
                disabled={mutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-50 text-white font-bold py-3 text-sm transition-colors shadow-md"
              >
                ⬆️ Enviar Ajuste
              </button>
              <button
                onClick={() => {
                  setShowFeedback(false);
                  setFeedback("");
                }}
                disabled={mutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold py-3 text-sm transition-colors"
              >
                ↩️ Voltar
              </button>
            </div>
          </div>
        )}

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
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-[var(--portal-primary)]">
            <TrendingUp className="size-3.5" />
            Resumo do mês · {format(now, "MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <div className="hidden md:flex items-baseline gap-2">
            <span className="text-2xl font-black text-[var(--portal-primary)] tracking-tight tabular-nums">{fmtBRL(monthTotal)}</span>
            <span className="text-[10px] uppercase tracking-widest text-white/60 font-bold">total faturado</span>
          </div>
        </div>
        <div className="md:hidden mt-2 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-black text-[var(--portal-primary)] tracking-tight">{fmtBRL(monthTotal)}</span>
          <span className="text-xs text-white/60 font-medium">total faturado</span>
        </div>

        <div className="mt-5 md:mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
          <FinanceStat label="✅ Pagas" value={paidTotal} color="#10B981" />
          <FinanceStat label="⏳ Pendentes" value={pendingTotal} color="var(--portal-primary)" />
          <FinanceStat label="🔴 Vencidas" value={overdueTotal} color="#EF4444" />
          <FinanceStat label="💰 Restante" value={remainingTotal} color="#F97316" />
          <FinanceStat label="📊 Total mês" value={monthTotal} color="var(--portal-primary)" />
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
        : { cls: "bg-[var(--portal-primary)] text-white", label: "💛 Pendente" };

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
              state === "overdue" ? "bg-[#EF4444] hover:bg-[#DC2626]" : "bg-[var(--portal-primary)] hover:bg-[var(--portal-primary-hover)]"
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
        : { cls: "bg-[var(--portal-primary)] text-white", label: "💛 Pendente" };

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
                state === "overdue" ? "bg-[#EF4444] hover:bg-[#DC2626]" : "bg-[var(--portal-primary)] hover:bg-[var(--portal-primary-hover)]"
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
                <div className="text-xl sm:text-2xl font-black tabular-nums text-[var(--portal-primary)]">
                  {fmtBRL(p.total || p.monthly_investment)}
                </div>
                {p.monthly_investment > 0 && p.total !== p.monthly_investment && (
                  <div className="text-xs font-semibold text-slate-700">
                    {fmtBRL(p.monthly_investment)}/mês
                  </div>
                )}
                <div className="text-xs text-slate-600 inline-flex items-center gap-1 font-medium">
                  <Calendar className="size-3.5 text-[var(--portal-primary)]" />
                  {format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setViewing({ kind: "proposal", data: p })}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--portal-primary)] hover:bg-[#FFAA20] text-[#0C1618] font-bold py-2.5 text-sm transition-colors shadow-md"
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
              border: "2px solid var(--portal-primary)",
            }}
          >
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--portal-primary)] mb-2">
              <Sparkles className="size-3" /> Contrato Ativo
            </div>
            <h3 className="font-bold text-lg sm:text-xl text-white leading-tight mb-3">
              {contract.title || "Contrato de Prestação de Serviços"}
            </h3>

            <div className="space-y-2 mb-5 text-sm">
              {(contract.start_date || contract.end_date) && (
                <div className="flex items-center gap-2 text-white/90">
                  <Calendar className="size-4 text-[var(--portal-primary)]" />
                  <span className="font-medium">
                    {contract.start_date ? format(new Date(contract.start_date + "T00:00:00"), "dd/MM/yyyy") : "—"}
                    {" → "}
                    {contract.end_date ? format(new Date(contract.end_date + "T00:00:00"), "dd/MM/yyyy") : "Indeterminado"}
                  </span>
                </div>
              )}
              {contract.monthly_value ? (
                <div className="text-white">
                  <span className="text-2xl font-black tabular-nums text-[var(--portal-primary)]">
                    {fmtBRL(contract.monthly_value)}
                  </span>
                  <span className="text-xs font-semibold text-white/80 ml-1">/mês</span>
                </div>
              ) : contract.total_value ? (
                <div className="text-white">
                  <span className="text-2xl font-black tabular-nums text-[var(--portal-primary)]">
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--portal-primary)] hover:bg-[#FFAA20] disabled:opacity-50 disabled:cursor-not-allowed text-[#0C1618] font-bold py-2.5 text-sm transition-colors shadow-md"
              >
                👁 Visualizar
              </button>
              {contract.public_token ? (
                <a
                  href={`/proposta/${contract.public_token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--portal-primary)] text-[var(--portal-primary)] hover:bg-[var(--portal-primary)] hover:text-[#0C1618] font-bold py-2.5 text-sm transition-colors"
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
              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--portal-primary)]">
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
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--portal-primary)] hover:bg-[#FFAA20] text-[#0C1618] font-bold py-3 text-sm transition-colors shadow-md"
            >
              ⬇ Baixar PDF
            </a>
          ) : (
            <button
              onClick={() => window.print()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--portal-primary)] hover:bg-[#FFAA20] text-[#0C1618] font-bold py-3 text-sm transition-colors shadow-md"
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
            <div className="text-2xl font-black tabular-nums text-[var(--portal-primary)] mt-1">
              {fmtBRL(p.total)}
            </div>
          </div>
        )}
        {p.monthly_investment > 0 && (
          <div className="rounded-xl border border-slate-200 p-4 bg-white">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
              Investimento mensal
            </div>
            <div className="text-2xl font-black tabular-nums text-[var(--portal-primary)] mt-1">
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

// ============= HOME / DASHBOARD =============

type HomeTab = "home" | "projects" | "approvals" | "finance" | "docs";

function HomeSection({
  data,
  pendingApprovals,
  urgentInvoicesCount,
  allClear,
  slug,
  onNavigate,
}: {
  data: ApiResponse;
  pendingApprovals: ApprovalItem[];
  urgentInvoicesCount: number;
  allClear: boolean;
  slug: string;
  onNavigate: (t: HomeTab) => void;
}) {
  const { invoices, attachments, approvalItems, events, jobs } = data;

  // ---- WRAPPED DO MÊS (resumo simples) ----
  const monthStats = useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    const inMonth = (iso?: string | null) => {
      if (!iso) return false;
      const d = new Date(iso);
      return d.getMonth() === m && d.getFullYear() === y;
    };
    const artesEntregues = (approvalItems || []).filter(
      (it: any) => it.status === "approved" && inMonth(it.approved_at || it.updated_at),
    ).length;
    const jobsConcluidos = (jobs || []).filter(
      (j: any) => j.status === "done" && inMonth(j.updated_at),
    ).length;
    const reunioes = (events || []).filter(
      (e) => (e.kind || "").toLowerCase() === "meeting" && inMonth(e.starts_at),
    ).length;
    return { artesEntregues, jobsConcluidos, reunioes };
  }, [approvalItems, jobs, events]);

  const monthName = new Date().toLocaleDateString("pt-BR", { month: "long" });

  // ---- HEALTH STATUS ----
  const hasOverdue = (invoices || []).some((i) => classifyInvoice(i) === "overdue");
  const healthTone: "green" | "yellow" | "red" = hasOverdue
    ? "red"
    : allClear
      ? "green"
      : "yellow";

  // ---- RECENT FILES (apenas aprovações aprovadas da última semana) ----
  const recentFiles = useMemo(() => {
    type Item = {
      id: string;
      url: string;
      name: string;
      kind: "image" | "video" | "pdf" | "other";
      createdAt: string;
    };
    const items: Item[] = [];
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    (approvalItems || []).forEach((it: any) => {
      if (!it.content_url) return;
      if (it.status !== "approved") return;
      const refDate = it.approved_at || it.updated_at || it.created_at;
      if (!refDate || new Date(refDate).getTime() < weekAgo) return;
      const kind: Item["kind"] =
        it.content_type === "image"
          ? "image"
          : it.content_type === "video"
            ? "video"
            : it.content_type === "pdf"
              ? "pdf"
              : "other";
      items.push({
        id: `ap-${it.id}`,
        url: it.content_url,
        name: it.title,
        kind,
        createdAt: refDate,
      });
    });
    return items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [approvalItems]);


  // ---- FINANCE KPI (current month) ----
  const now = new Date();
  const monthInvoices = (invoices || []).filter((i) => {
    if (!i.due_date) return false;
    const d = new Date(i.due_date + "T00:00:00");
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const paidTotal = monthInvoices.filter((i) => classifyInvoice(i) === "paid").reduce((s, i) => s + i.amount, 0);
  const pendingTotal = monthInvoices.filter((i) => classifyInvoice(i) === "pending").reduce((s, i) => s + i.amount, 0);
  const overdueTotal = monthInvoices.filter((i) => classifyInvoice(i) === "overdue").reduce((s, i) => s + i.amount, 0);

  // ---- LIGHTBOX ----
  const [lightbox, setLightbox] = useState<{ url: string; name: string; kind: string } | null>(null);

  const teaser = pendingApprovals[0];

  // ---- AÇÕES PENDENTES DO CLIENTE ----
  const actionItems = useMemo(() => {
    const items: Array<{
      key: string;
      icon: string;
      text: string;
      cta: string;
      tone: "red" | "yellow" | "blue";
      onClick: () => void;
    }> = [];

    if (pendingApprovals.length > 0) {
      items.push({
        key: "approvals",
        icon: "🎨",
        text:
          pendingApprovals.length === 1
            ? "1 arte aguardando sua aprovação"
            : `${pendingApprovals.length} artes aguardando aprovação`,
        cta: "Aprovar",
        tone: "blue",
        onClick: () => onNavigate("approvals"),
      });
    }

    const overdue = (invoices || []).filter((i) => classifyInvoice(i) === "overdue");
    if (overdue.length > 0) {
      items.push({
        key: "overdue",
        icon: "🔴",
        text:
          overdue.length === 1
            ? `1 fatura vencida — R$ ${overdue[0].amount.toFixed(2).replace(".", ",")}`
            : `${overdue.length} faturas vencidas`,
        cta: "Ver",
        tone: "red",
        onClick: () => onNavigate("finance"),
      });
    }

    const dueSoon = (invoices || []).filter((i) => {
      if (classifyInvoice(i) !== "pending" || !i.due_date) return false;
      const diff = (new Date(i.due_date + "T00:00:00").getTime() - Date.now()) / 86400000;
      return diff >= 0 && diff <= 3;
    });
    if (dueSoon.length > 0) {
      const next = dueSoon[0];
      const diff = Math.ceil(
        (new Date(next.due_date! + "T00:00:00").getTime() - Date.now()) / 86400000,
      );
      items.push({
        key: "due-soon",
        icon: "⏰",
        text:
          dueSoon.length === 1
            ? diff === 0
              ? "1 fatura vence hoje"
              : diff === 1
                ? "1 fatura vence amanhã"
                : `1 fatura vence em ${diff} dias`
            : `${dueSoon.length} faturas vencem nos próximos dias`,
        cta: "Ver",
        tone: "yellow",
        onClick: () => onNavigate("finance"),
      });
    }

    return items;
  }, [pendingApprovals, invoices, onNavigate]);

  return (
    <div className="space-y-5 md:space-y-6 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-6 animate-fade-in">
      <div className="lg:col-span-8 space-y-5 md:space-y-6">


      {/* O QUE PRECISA DE VOCÊ */}
      {actionItems.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 bg-gradient-to-r from-[var(--portal-primary)]/10 to-transparent border-b border-slate-100">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-700 inline-flex items-center gap-1.5">
              <AlertCircle className="size-3.5 text-[var(--portal-primary)]" />
              O que precisa de você
            </h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {actionItems.map((it) => {
              const toneCls =
                it.tone === "red"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : it.tone === "yellow"
                    ? "bg-[var(--portal-primary)] hover:opacity-90 text-white"
                    : "bg-slate-900 hover:bg-slate-800 text-white";
              return (
                <li key={it.key} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl leading-none flex-shrink-0">{it.icon}</span>
                  <p className="flex-1 min-w-0 text-sm font-semibold text-slate-800 truncate">
                    {it.text}
                  </p>
                  <button
                    onClick={it.onClick}
                    className={`flex-shrink-0 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${toneCls}`}
                  >
                    {it.cta} <ArrowRight className="size-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* WRAPPED — resumo do mês */}
      {(monthStats.artesEntregues + monthStats.jobsConcluidos + monthStats.reunioes) > 0 && (
        <section className="rounded-2xl p-4 md:p-5 bg-gradient-to-br from-[var(--portal-primary)]/10 via-white to-[var(--portal-primary)]/5 border border-[var(--portal-primary)]/20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-[var(--portal-primary)]" />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-700">
              Seu {monthName} até agora
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-slate-800">
            {monthStats.artesEntregues > 0 && (
              <span className="inline-flex items-baseline gap-1.5">
                <span className="text-2xl md:text-3xl font-black text-[var(--portal-primary)] leading-none">
                  {monthStats.artesEntregues}
                </span>
                <span className="text-sm font-semibold">
                  {monthStats.artesEntregues === 1 ? "arte entregue" : "artes entregues"}
                </span>
              </span>
            )}
            {monthStats.jobsConcluidos > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-baseline gap-1.5">
                  <span className="text-2xl md:text-3xl font-black text-[var(--portal-primary)] leading-none">
                    {monthStats.jobsConcluidos}
                  </span>
                  <span className="text-sm font-semibold">
                    {monthStats.jobsConcluidos === 1 ? "job concluído" : "jobs concluídos"}
                  </span>
                </span>
              </>
            )}
            {monthStats.reunioes > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-baseline gap-1.5">
                  <span className="text-2xl md:text-3xl font-black text-[var(--portal-primary)] leading-none">
                    {monthStats.reunioes}
                  </span>
                  <span className="text-sm font-semibold">
                    {monthStats.reunioes === 1 ? "reunião" : "reuniões"}
                  </span>
                </span>
              </>
            )}
          </div>
        </section>
      )}





      {/* RECENT FILES — aprovadas nos últimos 7 dias */}
      {recentFiles.length > 0 && (
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-700 inline-flex items-center gap-1.5">
            <Folder className="size-3.5 text-[var(--portal-primary)]" />
            Entregas da semana
          </h2>
          <button
            onClick={() => onNavigate("approvals")}
            className="text-[11px] font-bold text-slate-600 hover:text-[var(--portal-primary)] inline-flex items-center gap-1 transition-colors"
          >
            Ver todas <ArrowRight className="size-3" />
          </button>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2.5 md:gap-3">
          {recentFiles.map((f) => (
            <button
              key={f.id}
              onClick={() => setLightbox({ url: f.url, name: f.name, kind: f.kind })}
              className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 hover:border-[var(--portal-primary)] hover:shadow-md transition-all duration-200"
            >
              {f.kind === "image" ? (
                <img src={f.url} alt={f.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : f.kind === "video" ? (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                  <Play className="size-7 text-white" fill="white" />
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <FileText className="size-8 text-slate-500" strokeWidth={1.5} />
                </div>
              )}
              <span className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded-md bg-black/60 text-white font-bold backdrop-blur-sm">
                {f.kind === "image" ? "🖼️" : f.kind === "video" ? "🎬" : "📄"}
              </span>
              <span className="absolute inset-x-0 bottom-0 px-2 py-1 bg-gradient-to-t from-black/80 to-transparent text-[10px] text-white font-semibold truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {f.name}
              </span>
            </button>
          ))}
        </div>
      </section>
      )}






      {/* FINANCE KPIs */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-700 inline-flex items-center gap-1.5">
            <Wallet className="size-3.5 text-[var(--portal-primary)]" />
            Resumo de {format(now, "MMMM", { locale: ptBR })}
          </h2>
          <button
            onClick={() => onNavigate("finance")}
            className="text-[11px] font-bold text-slate-600 hover:text-[var(--portal-primary)] inline-flex items-center gap-1 transition-colors"
          >
            Ir para Financeiro <ArrowRight className="size-3" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2.5 md:gap-3">
          <KpiCard label="Pagas" value={paidTotal} color="#10B981" emoji="✅" />
          <KpiCard label="Pendentes" value={pendingTotal} color="var(--portal-primary)" emoji="⏳" />
          <KpiCard label="Vencidas" value={overdueTotal} color="#EF4444" emoji="🔴" />
        </div>
      </section>
      </div>
      {/* SIDEBAR (desktop only renders as side column; mobile flows naturally) */}
      <aside className="lg:col-span-4 space-y-5 md:space-y-6">
        <AgendaSection events={events || []} />
      </aside>


      {/* LIGHTBOX */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 size-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="size-5" />
          </button>
          <div className="max-w-5xl w-full max-h-[85vh] flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            {lightbox.kind === "image" ? (
              <img src={lightbox.url} alt={lightbox.name} className="max-w-full max-h-[75vh] object-contain rounded-lg" />
            ) : lightbox.kind === "video" ? (
              <video src={lightbox.url} controls autoPlay className="max-w-full max-h-[75vh] rounded-lg" />
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center max-w-md">
                <FileText className="size-16 text-slate-400 mx-auto mb-3" strokeWidth={1.5} />
                <p className="font-bold text-slate-900 mb-1">{lightbox.name}</p>
                <p className="text-sm text-slate-600 mb-4">Visualização não disponível para este tipo de arquivo.</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <p className="text-white/80 text-sm font-medium truncate max-w-xs">{lightbox.name}</p>
              <a
                href={lightbox.url}
                download={lightbox.name}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--portal-primary)] hover:bg-[#FFAA20] text-[#0C1618] font-bold px-4 py-2 text-sm shadow-md transition-colors"
              >
                <Download className="size-4" /> Baixar
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HealthCard({
  tone,
  pendingApprovals,
  overdue,
}: {
  tone: "green" | "yellow" | "red";
  pendingApprovals: number;
  overdue: boolean;
}) {
  const config =
    tone === "green"
      ? {
          bg: "from-emerald-500 to-emerald-600",
          emoji: "🟢",
          title: "TUDO VERDE",
          subtitle: "Projetos em dia, faturas pagas, sem pendências.",
        }
      : tone === "yellow"
        ? {
            bg: "from-amber-400 to-amber-500",
            emoji: "🟡",
            title: "ATENÇÃO",
            subtitle: pendingApprovals > 0
              ? `${pendingApprovals} item${pendingApprovals > 1 ? "s" : ""} aguardando sua aprovação.`
              : "Faturas vencendo nos próximos dias.",
          }
        : {
            bg: "from-rose-500 to-rose-600",
            emoji: "🔴",
            title: "AÇÃO NECESSÁRIA",
            subtitle: overdue
              ? "Existem faturas vencidas. Regularize para continuar tranquilo."
              : "Itens atrasados precisam de atenção.",
          };

  return (
    <div
      className={`rounded-2xl p-5 md:p-6 bg-gradient-to-br ${config.bg} text-white shadow-lg transition-all duration-500`}
    >
      <div className="flex items-center gap-4">
        <div className="text-4xl md:text-5xl leading-none animate-pulse">{config.emoji}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base md:text-lg font-black tracking-wide uppercase">{config.title}</h3>
          <p className="text-xs md:text-sm text-white/90 font-medium mt-0.5">{config.subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color, emoji }: { label: string; value: number; color: string; emoji: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 md:p-4 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
        <span>{emoji}</span>
        <span>{label}</span>
      </div>
      <div className="mt-1 md:mt-1.5 text-base md:text-xl font-black tabular-nums leading-tight" style={{ color }}>
        {fmtBRL(value)}
      </div>
    </div>
  );
}


function AgendaSection({ events }: { events: CalendarEventRow[] }) {
  if (!events.length) return null;

  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEventRow[]>();
    events.forEach((ev) => {
      const d = new Date(ev.starts_at);
      const key = d.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    });
    return Array.from(map.entries()).slice(0, 8);
  }, [events]);

  const KIND_META: Record<string, { emoji: string; label: string }> = {
    meeting: { emoji: "📞", label: "Reunião" },
    post: { emoji: "📱", label: "Publicação" },
    delivery: { emoji: "🚀", label: "Entrega" },
    deadline: { emoji: "⏰", label: "Prazo" },
    other: { emoji: "📌", label: "Evento" },
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-700 inline-flex items-center gap-1.5">
          <Calendar className="size-3.5 text-[var(--portal-primary)]" />
          Próximas datas
        </h2>
        <span className="text-[11px] font-bold text-slate-500">
          {events.length} {events.length === 1 ? "evento" : "eventos"}
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
        {grouped.map(([dateKey, dayEvents]) => {
          const d = new Date(dateKey + "T12:00:00");
          const day = d.getDate();
          const month = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
          const weekday = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
          const isToday = dateKey === new Date().toISOString().slice(0, 10);
          return (
            <div key={dateKey} className="flex gap-3 p-3.5">
              {/* date pill */}
              <div
                className={`flex-shrink-0 w-14 rounded-xl flex flex-col items-center justify-center py-2 ${
                  isToday
                    ? "bg-[var(--portal-primary)] text-white"
                    : "bg-slate-50 text-slate-700"
                }`}
              >
                <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">{weekday}</span>
                <span className="text-xl font-black leading-none mt-0.5">{day}</span>
                <span className="text-[9px] font-bold uppercase mt-0.5 opacity-70">{month}</span>
              </div>

              {/* events */}
              <div className="flex-1 min-w-0 space-y-1.5">
                {dayEvents.map((ev) => {
                  const kindKey = (ev.kind || "other").toLowerCase();
                  const meta = KIND_META[kindKey] || KIND_META.other;
                  const time = ev.all_day
                    ? "Dia todo"
                    : new Date(ev.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={ev.id} className="flex items-start gap-2">
                      <span className="text-base leading-tight mt-0.5">{meta.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 leading-tight truncate">{ev.title}</p>
                        <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                          {time} • {meta.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MinhaKasaDarkStyles() {
  // Scoped dark-mode overrides for the minha-kasa portal.
  // Maps slate/white utility classes used in this file to dark equivalents
  // so we can offer a dark theme without rewriting every component.
  const css = `
[data-mk-theme="dark"] .bg-white { background-color: #161b2b !important; }
[data-mk-theme="dark"] .bg-slate-50 { background-color: #0f1422 !important; }
[data-mk-theme="dark"] .bg-slate-100 { background-color: #1f2638 !important; }
[data-mk-theme="dark"] .bg-slate-200 { background-color: #2a3247 !important; }
[data-mk-theme="dark"] .bg-slate-900 { background-color: #e2e8f0 !important; }
[data-mk-theme="dark"] .border-white { border-color: #161b2b !important; }
[data-mk-theme="dark"] .ring-white { --tw-ring-color: #161b2b !important; }
[data-mk-theme="dark"] .border-slate-100 { border-color: rgba(255,255,255,0.06) !important; }
[data-mk-theme="dark"] .border-slate-200 { border-color: rgba(255,255,255,0.10) !important; }
[data-mk-theme="dark"] .border-slate-300 { border-color: rgba(255,255,255,0.16) !important; }
[data-mk-theme="dark"] .divide-slate-100 > :not([hidden]) ~ :not([hidden]) { border-color: rgba(255,255,255,0.06) !important; }
[data-mk-theme="dark"] .from-slate-100 { --tw-gradient-from: #1f2638 var(--tw-gradient-from-position) !important; --tw-gradient-to: rgba(31,38,56,0) var(--tw-gradient-to-position) !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important; }
[data-mk-theme="dark"] .to-slate-200 { --tw-gradient-to: #2a3247 var(--tw-gradient-to-position) !important; }
[data-mk-theme="dark"] .text-slate-400 { color: #94a3b8 !important; }
[data-mk-theme="dark"] .text-slate-500 { color: #94a3b8 !important; }
[data-mk-theme="dark"] .text-slate-600 { color: #cbd5e1 !important; }
[data-mk-theme="dark"] .text-slate-700 { color: #e2e8f0 !important; }
[data-mk-theme="dark"] .text-slate-800 { color: #f1f5f9 !important; }
[data-mk-theme="dark"] .text-slate-900 { color: #f8fafc !important; }
[data-mk-theme="dark"] .shadow-sm,
[data-mk-theme="dark"] .shadow,
[data-mk-theme="dark"] .shadow-md,
[data-mk-theme="dark"] .shadow-lg { box-shadow: 0 4px 14px rgba(0,0,0,0.45) !important; }

/* Override hardcoded brand-dark (#0C1618) — invisible on dark surfaces */
[data-mk-theme="dark"] .text-\\[\\#0C1618\\] { color: #f8fafc !important; }
[data-mk-theme="dark"] .border-\\[\\#0C1618\\] { border-color: rgba(255,255,255,0.25) !important; }
[data-mk-theme="dark"] .bg-\\[\\#0C1618\\] { background-color: #1f2638 !important; }
[data-mk-theme="dark"] .hover\\:bg-\\[\\#0C1618\\]:hover { background-color: #1f2638 !important; }
[data-mk-theme="dark"] .hover\\:text-\\[\\#0C1618\\]:hover { color: #f8fafc !important; }
`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
