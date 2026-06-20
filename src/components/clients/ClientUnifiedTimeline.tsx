import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  FileText, FileSignature, Rocket, CheckSquare, CheckCircle2, XCircle,
  Sparkles, ArrowRight, Wallet, Activity, AlertCircle, Play
} from "lucide-react";
import { brl } from "@/lib/utils-format";

export type UnifiedEvent = {
  id: string;
  ts: string; // ISO
  category: "proposal" | "contract" | "project" | "onboarding" | "job" | "dme" | "payment" | "other";
  variant?: "created" | "sent" | "approved" | "rejected" | "completed" | "received" | "overdue";
  title: string;
  description?: string | null;
  link?: { to: string; label?: string };
  amount?: number | null;
};

const STYLE: Record<string, { icon: any; cls: string; bg: string; ring: string }> = {
  "proposal.created":   { icon: FileText,      cls: "text-amber-500",   bg: "bg-amber-500/10",   ring: "ring-amber-500/30" },
  "proposal.sent":      { icon: ArrowRight,    cls: "text-blue-500",    bg: "bg-blue-500/10",    ring: "ring-blue-500/30" },
  "proposal.approved":  { icon: CheckCircle2,  cls: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30" },
  "proposal.rejected":  { icon: XCircle,       cls: "text-red-500",     bg: "bg-red-500/10",     ring: "ring-red-500/30" },
  "contract.created":   { icon: FileSignature, cls: "text-primary",     bg: "bg-primary/10",     ring: "ring-primary/30" },
  "project.created":    { icon: Rocket,        cls: "text-purple-500",  bg: "bg-purple-500/10",  ring: "ring-purple-500/30" },
  "onboarding.created": { icon: Play,          cls: "text-emerald-400", bg: "bg-emerald-400/10", ring: "ring-emerald-400/30" },
  "onboarding.completed": { icon: CheckCircle2, cls: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30" },
  "job.created":        { icon: CheckSquare,   cls: "text-foreground/60", bg: "bg-muted",        ring: "ring-border" },
  "job.completed":      { icon: CheckCircle2,  cls: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30" },
  "dme.created":        { icon: Sparkles,      cls: "text-amber-500",   bg: "bg-amber-500/10",   ring: "ring-amber-500/30" },
  "dme.approved":       { icon: CheckCircle2,  cls: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30" },
  "dme.rejected":       { icon: XCircle,       cls: "text-red-500",     bg: "bg-red-500/10",     ring: "ring-red-500/30" },
  "payment.received":   { icon: Wallet,        cls: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30" },
  "payment.overdue":    { icon: AlertCircle,   cls: "text-red-500",     bg: "bg-red-500/10",     ring: "ring-red-500/30" },
  "other":              { icon: Activity,      cls: "text-foreground/50", bg: "bg-muted",        ring: "ring-border" },
};

function styleKey(e: UnifiedEvent) {
  const k = `${e.category}.${e.variant ?? "created"}`;
  return STYLE[k] ? k : (STYLE[e.category] ? e.category : "other");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

const GROUP_LABELS: Record<string, string> = {
  proposal: "Proposta",
  contract: "Contrato",
  project: "Projeto",
  onboarding: "Onboarding",
  job: "Job",
  dme: "DME",
  payment: "Financeiro",
  other: "Atividade",
};

export function buildUnifiedEvents(input: {
  proposals?: any[];
  contracts?: any[];
  projects?: any[];
  jobs?: any[];
  dmes?: any[];
  transactions?: any[];
  onboardings?: any[];
}): UnifiedEvent[] {
  const out: UnifiedEvent[] = [];

  for (const p of input.proposals ?? []) {
    out.push({
      id: `prop-c-${p.id}`,
      ts: p.created_at,
      category: "proposal",
      variant: "created",
      title: `Proposta criada · ${p.title}`,
      link: { to: `/propostas/${p.id}` },
    });
    if (p.sent_at) out.push({
      id: `prop-s-${p.id}`, ts: p.sent_at, category: "proposal", variant: "sent",
      title: `Proposta enviada · ${p.title}`, link: { to: `/propostas/${p.id}` },
    });
    if (p.accepted_at || ["Aprovada", "accepted", "signed", "converted"].includes(p.status)) {
      out.push({
        id: `prop-a-${p.id}`,
        ts: p.accepted_at || p.signed_at || p.updated_at || p.created_at,
        category: "proposal", variant: "approved",
        title: `Proposta aprovada · ${p.title}`,
        amount: Number(p.total ?? 0) || null,
        link: { to: `/propostas/${p.id}` },
      });
    }
    if (["Recusada", "rejected"].includes(p.status)) {
      out.push({
        id: `prop-r-${p.id}`, ts: p.updated_at || p.created_at,
        category: "proposal", variant: "rejected",
        title: `Proposta recusada · ${p.title}`,
        link: { to: `/propostas/${p.id}` },
      });
    }
  }

  for (const c of input.contracts ?? []) {
    out.push({
      id: `ctr-${c.id}`,
      ts: c.start_date || c.created_at,
      category: "contract", variant: "created",
      title: `Contrato iniciado · ${c.title ?? "Sem título"}`,
      description: c.monthly_value ? `Fee mensal ${brl(Number(c.monthly_value))}` : null,
      amount: c.monthly_value ? Number(c.monthly_value) : null,
    });
  }

  for (const pr of input.projects ?? []) {
    out.push({
      id: `prj-${pr.id}`,
      ts: pr.created_at,
      category: "project", variant: "created",
      title: `Projeto criado · ${pr.name ?? pr.title ?? "Projeto"}`,
    });
  }

  for (const o of input.onboardings ?? []) {
    out.push({
      id: `onb-${o.id}`,
      ts: o.created_at || o.start_date,
      category: "onboarding", variant: "created",
      title: `Onboarding iniciado · ${o.title ?? ""}`,
    });
    if (o.completed_at) out.push({
      id: `onb-c-${o.id}`, ts: o.completed_at,
      category: "onboarding", variant: "completed",
      title: `Onboarding concluído · ${o.title ?? ""}`,
    });
  }

  for (const j of input.jobs ?? []) {
    out.push({
      id: `job-c-${j.id}`,
      ts: j.created_at,
      category: "job", variant: "created",
      title: `Job criado · ${j.title}`,
    });
    if (j.done_at) out.push({
      id: `job-d-${j.id}`, ts: j.done_at,
      category: "job", variant: "completed",
      title: `Job concluído · ${j.title}`,
    });
  }

  for (const d of input.dmes ?? []) {
    out.push({
      id: `dme-c-${d.id}`, ts: d.created_at,
      category: "dme", variant: "created",
      title: `DME criada · ${d.title}`,
      amount: Number(d.value ?? 0) || null,
    });
    if (d.approved_at) out.push({
      id: `dme-a-${d.id}`, ts: d.approved_at,
      category: "dme", variant: "approved",
      title: `DME aprovada · ${d.title}`,
      amount: Number(d.value ?? 0) || null,
    });
    if (d.rejected_at) out.push({
      id: `dme-r-${d.id}`, ts: d.rejected_at,
      category: "dme", variant: "rejected",
      title: `DME recusada · ${d.title}`,
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  for (const t of input.transactions ?? []) {
    if (t.type !== "income" && t.kind !== "income") continue;
    if (t.status === "paid") {
      out.push({
        id: `tx-p-${t.id}`,
        ts: t.paid_at || t.updated_at || t.due_date,
        category: "payment", variant: "received",
        title: `Pagamento recebido · ${t.description ?? ""}`,
        amount: Number(t.amount ?? 0) || null,
      });
    } else if (t.status === "pending" && t.due_date && t.due_date < today) {
      out.push({
        id: `tx-o-${t.id}`,
        ts: t.due_date,
        category: "payment", variant: "overdue",
        title: `Pagamento em atraso · ${t.description ?? ""}`,
        amount: Number(t.amount ?? 0) || null,
      });
    }
  }

  return out
    .filter((e) => !!e.ts)
    .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
}

export function ClientUnifiedTimeline({
  events,
  emptyHint = "Nenhuma atividade registrada ainda.",
  limit,
  filter,
  onFilterChange,
}: {
  events: UnifiedEvent[];
  emptyHint?: string;
  limit?: number;
  filter?: string;
  onFilterChange?: (v: string) => void;
}) {
  const filtered = useMemo(() => {
    const list = filter && filter !== "all" ? events.filter((e) => e.category === filter) : events;
    return limit ? list.slice(0, limit) : list;
  }, [events, filter, limit]);

  const filters: { v: string; label: string }[] = [
    { v: "all", label: "Tudo" },
    { v: "proposal", label: "Propostas" },
    { v: "contract", label: "Contratos" },
    { v: "onboarding", label: "Onboarding" },
    { v: "job", label: "Jobs" },
    { v: "dme", label: "DMEs" },
    { v: "payment", label: "Pagamentos" },
  ];

  return (
    <div className="space-y-4">
      {onFilterChange && (
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.v}
              type="button"
              onClick={() => onFilterChange(f.v)}
              className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold transition ${
                (filter ?? "all") === f.v
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface border border-border text-foreground/60 hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="size-10 rounded-full bg-muted grid place-items-center mb-3">
            <Activity className="size-5 text-foreground/20" />
          </div>
          <p className="text-xs text-foreground/40">{emptyHint}</p>
        </div>
      ) : (
        <div className="relative space-y-5 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:via-border before:to-transparent">
          {filtered.map((e) => {
            const k = styleKey(e);
            const s = STYLE[k];
            const Icon = s.icon;
            const content = (
              <>
                <div className={`mt-0.5 size-8 rounded-full ${s.bg} grid place-items-center shrink-0 z-10 ring-4 ring-background ring-offset-0`}>
                  <Icon className={`size-4 ${s.cls}`} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono-kasa uppercase tracking-widest text-foreground/30 mr-2">
                        {GROUP_LABELS[e.category]}
                      </span>
                      <span className="text-sm font-semibold text-foreground/90">{e.title}</span>
                    </div>
                    <time className="text-[10px] uppercase tracking-wider text-foreground/40 font-medium whitespace-nowrap">
                      {fmtDate(e.ts)}
                    </time>
                  </div>
                  {e.description && (
                    <p className="text-xs text-foreground/60 mt-1">{e.description}</p>
                  )}
                  {e.amount != null && (
                    <p className={`text-[11px] font-bold mt-1 ${s.cls}`}>{brl(e.amount)}</p>
                  )}
                </div>
              </>
            );
            return e.link ? (
              <Link
                key={e.id}
                to={e.link.to}
                className="relative flex items-start gap-4 group hover:bg-muted/20 rounded-xl p-1.5 -m-1.5 transition"
              >
                {content}
              </Link>
            ) : (
              <div key={e.id} className="relative flex items-start gap-4">
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
