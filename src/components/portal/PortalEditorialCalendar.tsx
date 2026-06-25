import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listEditorialPosts, approveAllPostsForMonth, approvePost,
  type EditorialPost, SOCIAL_LABEL, SOCIAL_COLOR, STATUS_LABEL, STATUS_COLOR, CONTENT_TYPE_LABEL,
} from "@/lib/editorial-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function PortalEditorialCalendar({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selected, setSelected] = useState<EditorialPost | null>(null);

  const range = useMemo(() => ({
    from: new Date(cursor.getFullYear(), cursor.getMonth(), 1).toISOString(),
    to: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1).toISOString(),
  }), [cursor]);

  const { data: posts = [] } = useQuery({
    queryKey: ["portal-editorial-posts", clientId, range.from],
    queryFn: () => listEditorialPosts({ clientId, from: range.from, to: range.to }),
  });

  const approveMonth = useMutation({
    mutationFn: () => approveAllPostsForMonth(clientId, cursor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-editorial-posts"] });
      toast.success("Calendário do mês aprovado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: (id: string) => approvePost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-editorial-posts"] });
      toast.success("Post aprovado!");
      setSelected(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const start = new Date(cursor); start.setDate(1 - cursor.getDay());
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  const byDay: Record<string, EditorialPost[]> = {};
  for (const p of posts) {
    const k = new Date(p.scheduled_at).toDateString();
    (byDay[k] ||= []).push(p);
  }

  const pendingCount = posts.filter(p => p.status === "in_production" || p.status === "review").length;

  return (
    <Card className="bg-surface border-border p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">Calendário do mês</h2>
          <p className="text-xs text-foreground/50 mt-0.5 capitalize">
            {cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-background/50 p-1 rounded-lg border border-border">
            <Button variant="ghost" size="icon" className="size-8" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button
            disabled={pendingCount === 0 || approveMonth.isPending}
            onClick={() => { if (confirm(`Aprovar ${pendingCount} posts deste mês?`)) approveMonth.mutate(); }}
          >
            <CheckCheck className="size-4 mr-1" /> Aprovar mês {pendingCount > 0 && `(${pendingCount})`}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => (
          <div key={d} className="bg-background p-2 text-[10px] font-mono-kasa text-foreground/40 text-center">{d}</div>
        ))}
        {days.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const dayPosts = byDay[d.toDateString()] ?? [];
          return (
            <div key={i} className={cn("bg-background min-h-[90px] p-1.5 flex flex-col gap-1", !inMonth && "bg-background/40")}>
              <span className="text-[10px] font-mono-kasa text-foreground/40">{d.getDate()}</span>
              {dayPosts.slice(0, 3).map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={cn("text-[9px] px-1.5 py-1 rounded-md border text-left truncate", SOCIAL_COLOR[p.social_network])}
                >
                  {p.title}
                </button>
              ))}
              {dayPosts.length > 3 && <span className="text-[8px] text-foreground/40">+{dayPosts.length - 3}</span>}
            </div>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="bg-surface border-border">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{selected.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className={cn("text-[9px]", SOCIAL_COLOR[selected.social_network])}>{SOCIAL_LABEL[selected.social_network]}</Badge>
                  <Badge variant="outline" className="text-[9px]">{CONTENT_TYPE_LABEL[selected.content_type]}</Badge>
                  <Badge variant="outline" className={cn("text-[9px]", STATUS_COLOR[selected.status])}>{STATUS_LABEL[selected.status]}</Badge>
                </div>
                <p className="text-xs text-foreground/60">
                  Publicação prevista: {new Date(selected.scheduled_at).toLocaleString("pt-BR")}
                </p>
                {selected.description && (
                  <div className="text-sm whitespace-pre-wrap p-3 bg-background rounded-md border border-border">
                    {selected.description}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>Fechar</Button>
                {selected.status !== "approved" && (
                  <Button onClick={() => approve.mutate(selected.id)} disabled={approve.isPending}>
                    <Check className="size-4 mr-1" /> Aprovar este post
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
