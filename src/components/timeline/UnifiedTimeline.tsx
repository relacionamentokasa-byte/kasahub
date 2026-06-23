import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2,
  MessageSquare,
  History as HistoryIcon,
  Send,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  ListChecks,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

export type TimelineEvent = {
  id: string;
  kind:
    | "status"
    | "comment"
    | "checklist"
    | "approval_sent"
    | "approval_approved"
    | "approval_rejected"
    | "attachment"
    | "generic";
  title: string;
  description?: string;
  author?: string | null;
  at: string;
};

const ICONS: Record<TimelineEvent["kind"], React.ComponentType<{ className?: string }>> = {
  status: HistoryIcon,
  comment: MessageSquare,
  checklist: ListChecks,
  approval_sent: Send,
  approval_approved: ThumbsUp,
  approval_rejected: ThumbsDown,
  attachment: Paperclip,
  generic: CheckCircle2,
};

const COLORS: Record<TimelineEvent["kind"], string> = {
  status: "text-foreground/70 bg-muted",
  comment: "text-blue-500 bg-blue-500/10",
  checklist: "text-amber-500 bg-amber-500/10",
  approval_sent: "text-violet-500 bg-violet-500/10",
  approval_approved: "text-emerald-500 bg-emerald-500/10",
  approval_rejected: "text-rose-500 bg-rose-500/10",
  attachment: "text-foreground/60 bg-muted",
  generic: "text-foreground/60 bg-muted",
};

async function fetchJobTimeline(jobId: string): Promise<TimelineEvent[]> {
  const [hist, comments, checklist, approvals] = await Promise.all([
    supabase
      .from("job_history")
      .select("id, action, from_value, to_value, created_at, user_id")
      .eq("job_id", jobId),
    supabase
      .from("job_comments")
      .select("id, content, created_at, user_id, is_system, type")
      .eq("job_id", jobId),
    supabase
      .from("job_checklist")
      .select("id, content, done, created_at, responsible_id")
      .eq("job_id", jobId)
      .eq("done", true),
    supabase
      .from("job_approval_logs")
      .select("id, action, feedback, created_by, created_at")
      .eq("job_id", jobId),
  ]);

  const userIds = new Set<string>();
  hist.data?.forEach((r) => r.user_id && userIds.add(r.user_id));
  comments.data?.forEach((r) => r.user_id && userIds.add(r.user_id));
  checklist.data?.forEach((r: any) => r.responsible_id && userIds.add(r.responsible_id));

  const profilesMap = new Map<string, string>();
  if (userIds.size > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name, full_name")
      .in("id", Array.from(userIds));
    profs?.forEach((p) => profilesMap.set(p.id, p.display_name || p.full_name || ""));
  }

  const events: TimelineEvent[] = [];

  hist.data?.forEach((r: any) => {
    events.push({
      id: `h-${r.id}`,
      kind: "status",
      title: r.action || "Atualização",
      description: r.from_value && r.to_value ? `${r.from_value} → ${r.to_value}` : undefined,
      author: r.user_id ? profilesMap.get(r.user_id) : null,
      at: r.created_at,
    });
  });

  comments.data?.forEach((r: any) => {
    events.push({
      id: `c-${r.id}`,
      kind: r.is_system ? "status" : "comment",
      title: r.is_system ? r.content : "Comentou",
      description: r.is_system ? undefined : r.content,
      author: r.user_id ? profilesMap.get(r.user_id) : null,
      at: r.created_at,
    });
  });

  checklist.data?.forEach((r: any) => {
    events.push({
      id: `cl-${r.id}`,
      kind: "checklist",
      title: `Concluiu: ${r.content}`,
      author: r.responsible_id ? profilesMap.get(r.responsible_id) : null,
      at: r.created_at,
    });
  });

  approvals.data?.forEach((r: any) => {
    const kind: TimelineEvent["kind"] =
      r.action === "approved"
        ? "approval_approved"
        : r.action === "rejected"
        ? "approval_rejected"
        : "approval_sent";
    events.push({
      id: `a-${r.id}`,
      kind,
      title:
        r.action === "approved"
          ? "Cliente aprovou"
          : r.action === "rejected"
          ? "Cliente pediu ajuste"
          : "Enviado para aprovação",
      description: r.feedback ?? undefined,
      author: r.created_by,
      at: r.created_at,
    });
  });

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "EEEE, dd MMM", { locale: ptBR });
}

export function UnifiedTimeline({ jobId }: { jobId: string }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["unified-timeline", "job", jobId],
    queryFn: () => fetchJobTimeline(jobId),
    enabled: !!jobId,
  });

  if (isLoading) {
    return <p className="text-xs text-foreground/40 py-4 text-center">Carregando atividade…</p>;
  }

  if (events.length === 0) {
    return (
      <p className="text-xs text-foreground/40 uppercase font-bold tracking-widest text-center py-6">
        Nenhuma atividade registrada ainda
      </p>
    );
  }

  // Group by day label
  const groups = new Map<string, TimelineEvent[]>();
  for (const e of events) {
    const k = dayLabel(e.at);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }

  return (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([day, items]) => (
        <div key={day} className="space-y-3">
          <div className="text-[10px] uppercase font-bold tracking-widest text-foreground/40">
            {day}
          </div>
          <ol className="space-y-2.5">
            {items.map((e) => {
              const Icon = ICONS[e.kind];
              return (
                <li
                  key={e.id}
                  className="flex gap-3 items-start p-3 rounded-xl border border-border/60 bg-background/40 hover:bg-background/70 transition"
                >
                  <div className={`size-7 rounded-lg flex items-center justify-center shrink-0 ${COLORS[e.kind]}`}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">
                      {e.author && <span className="text-foreground">{e.author} </span>}
                      <span className="text-foreground/70">{e.title.toLowerCase()}</span>
                    </p>
                    {e.description && (
                      <p className="text-xs text-foreground/60 mt-1 line-clamp-3 whitespace-pre-wrap">
                        {e.description}
                      </p>
                    )}
                    <p className="text-[10px] text-foreground/40 mt-1.5 font-mono">
                      {format(new Date(e.at), "HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
