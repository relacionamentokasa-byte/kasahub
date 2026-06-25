import { useMemo, useState } from "react";
import {
  DndContext, DragEndEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  updateEditorialPost, type EditorialPost,
  SOCIAL_LABEL, SOCIAL_COLOR, STATUS_COLOR, STATUS_LABEL,
} from "@/lib/editorial-api";
import { toast } from "sonner";

interface Props {
  posts: EditorialPost[];
  cursor: Date;
  onCursorChange: (d: Date) => void;
  onSelectPost: (p: EditorialPost) => void;
  onCreateOnDay: (d: Date) => void;
}

function Card({ post, onClick }: { post: EditorialPost; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: post.id });
  const style = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, zIndex: 50 } : undefined;
  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        "w-full text-left text-[10px] px-1.5 py-1 rounded-md border truncate transition-colors",
        SOCIAL_COLOR[post.social_network],
        isDragging && "opacity-50",
      )}
      title={`${SOCIAL_LABEL[post.social_network]} • ${STATUS_LABEL[post.status]}`}
    >
      <span className="inline-flex items-center gap-1 w-full min-w-0">
        <SocialIcon network={post.social_network} size={12} className="shrink-0" />
        <span className="font-bold truncate">{post.title}</span>
      </span>
    </button>
  );
}

function DayCell({
  day, inMonth, isToday, posts, onSelectPost, onCreate,
}: {
  day: Date; inMonth: boolean; isToday: boolean; posts: EditorialPost[];
  onSelectPost: (p: EditorialPost) => void; onCreate: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `day-${day.toISOString().slice(0, 10)}` });
  return (
    <div
      ref={setNodeRef}
      onClick={onCreate}
      className={cn(
        "bg-background min-h-[110px] p-2 flex flex-col gap-1 border-r border-border last:border-r-0 cursor-pointer",
        !inMonth && "bg-background/40",
        isOver && "ring-2 ring-primary/50",
        isToday && "relative after:absolute after:inset-0 after:ring-1 after:ring-primary/30 after:pointer-events-none",
      )}
    >
      <span className={cn(
        "text-[10px] font-mono-kasa flex items-center justify-center size-5 rounded-full",
        isToday ? "bg-primary text-primary-foreground" : "text-foreground/50",
      )}>
        {day.getDate()}
      </span>
      <div className="flex flex-col gap-1 mt-1">
        {posts.slice(0, 4).map(p => <Card key={p.id} post={p} onClick={() => onSelectPost(p)} />)}
        {posts.length > 4 && <span className="text-[9px] text-foreground/40">+{posts.length - 4} mais</span>}
      </div>
    </div>
  );
}

export function EditorialMonthGrid({ posts, cursor, onCursorChange, onSelectPost, onCreateOnDay }: Props) {
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const move = useMutation({
    mutationFn: async ({ id, newDate }: { id: string; newDate: string }) =>
      updateEditorialPost(id, { scheduled_at: newDate }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["editorial-posts"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const start = useMemo(() => {
    const s = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    s.setDate(1 - s.getDay());
    return s;
  }, [cursor]);

  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i); return d;
  }), [start]);

  const byDay = useMemo(() => {
    const map: Record<string, EditorialPost[]> = {};
    for (const p of posts) {
      const k = new Date(p.scheduled_at).toDateString();
      (map[k] ||= []).push(p);
    }
    return map;
  }, [posts]);

  const today = new Date().toDateString();
  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const handleEnd = (e: DragEndEvent) => {
    const overId = String(e.over?.id ?? "");
    if (!overId.startsWith("day-")) return;
    const postId = String(e.active.id);
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const dayStr = overId.slice(4);
    const old = new Date(post.scheduled_at);
    const next = new Date(dayStr + "T00:00:00");
    next.setHours(old.getHours(), old.getMinutes(), 0, 0);
    if (next.toDateString() === old.toDateString()) return;
    move.mutate({ id: postId, newDate: next.toISOString() });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 px-2">
        <h3 className="font-display text-xl capitalize">{monthLabel}</h3>
        <div className="flex items-center gap-1 bg-background/50 p-1 rounded-lg border border-border">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs px-3" onClick={() => onCursorChange(new Date())}>Hoje</Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleEnd}>
        <div className="grid grid-cols-7 gap-px bg-border border-y border-border">
          {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => (
            <div key={d} className="bg-surface p-2 text-[10px] font-mono-kasa text-foreground/40 text-center">{d}</div>
          ))}
          {days.map((d, i) => (
            <DayCell
              key={i}
              day={d}
              inMonth={d.getMonth() === cursor.getMonth()}
              isToday={d.toDateString() === today}
              posts={byDay[d.toDateString()] ?? []}
              onSelectPost={onSelectPost}
              onCreate={() => onCreateOnDay(d)}
            />
          ))}
        </div>
      </DndContext>

      <div className="flex flex-wrap gap-2 px-2 pt-2">
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <Badge key={k} variant="outline" className={cn("text-[9px]", STATUS_COLOR[k as keyof typeof STATUS_COLOR])}>{v}</Badge>
        ))}
      </div>
    </div>
  );
}
