import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  type EditorialPost, SOCIAL_LABEL, SOCIAL_COLOR, STATUS_LABEL, STATUS_COLOR, CONTENT_TYPE_LABEL,
} from "@/lib/editorial-api";

interface Props {
  posts: EditorialPost[];
  cursor: Date;
  onCursorChange: (d: Date) => void;
  onSelectPost: (p: EditorialPost) => void;
}

export function EditorialWeekList({ posts, cursor, onCursorChange, onSelectPost }: Props) {
  const navigate = useNavigate();
  const start = useMemo(() => {
    const s = new Date(cursor);
    s.setDate(s.getDate() - s.getDay());
    s.setHours(0, 0, 0, 0);
    return s;
  }, [cursor]);

  const end = useMemo(() => {
    const e = new Date(start);
    e.setDate(e.getDate() + 7);
    return e;
  }, [start]);

  const weekPosts = posts.filter(p => {
    const d = new Date(p.scheduled_at);
    return d >= start && d < end;
  }).sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 px-2">
        <h3 className="font-display text-xl">
          Semana de {start.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} a {new Date(end.getTime() - 1).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
        </h3>
        <div className="flex items-center gap-1 bg-background/50 p-1 rounded-lg border border-border">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => { const d = new Date(cursor); d.setDate(d.getDate() - 7); onCursorChange(d); }}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs px-3" onClick={() => onCursorChange(new Date())}>Hoje</Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => { const d = new Date(cursor); d.setDate(d.getDate() + 7); onCursorChange(d); }}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden divide-y divide-border bg-background">
        {weekPosts.length === 0 && (
          <div className="p-10 text-center text-foreground/50 text-sm">Nenhum post planejado nesta semana.</div>
        )}
        {weekPosts.map(p => {
          const d = new Date(p.scheduled_at);
          return (
            <button
              key={p.id}
              onClick={() => onSelectPost(p)}
              className="w-full text-left p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="text-center w-20 shrink-0">
                <p className="text-xs font-mono-kasa text-foreground/40 uppercase">{d.toLocaleDateString("pt-BR", { weekday: "short" })}</p>
                <p className="text-2xl font-display">{d.getDate().toString().padStart(2, "0")}</p>
                <p className="text-[10px] font-mono-kasa text-foreground/40">{d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{p.title}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className={cn("text-[9px]", SOCIAL_COLOR[p.social_network])}>{SOCIAL_LABEL[p.social_network]}</Badge>
                  <Badge variant="outline" className="text-[9px]">{CONTENT_TYPE_LABEL[p.content_type]}</Badge>
                  <Badge variant="outline" className={cn("text-[9px]", STATUS_COLOR[p.status])}>{STATUS_LABEL[p.status]}</Badge>
                </div>
                {p.description && <p className="text-xs text-foreground/60 mt-1 line-clamp-2">{p.description}</p>}
              </div>
              {p.job_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); navigate({ to: "/jobs", search: { openJobId: p.job_id! } as any }); }}
                >
                  <ExternalLink className="size-3 mr-1" /> Job
                </Button>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
