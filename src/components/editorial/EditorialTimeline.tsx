import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type EditorialPost, SOCIAL_LABEL, STATUS_LABEL, STATUS_COLOR,
  type SocialNetwork,
} from "@/lib/editorial-api";
import { SocialIcon } from "./SocialIcon";

const NETWORKS: SocialNetwork[] = ["instagram", "youtube", "tiktok", "linkedin", "facebook", "other"];
const DAY_W = 92; // px per day column

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d); x.setDate(x.getDate() + n); return x;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function EditorialTimeline({
  posts, cursor, onCursorChange, onSelectPost,
}: {
  posts: EditorialPost[];
  cursor: Date;
  onCursorChange: (d: Date) => void;
  onSelectPost: (p: EditorialPost) => void;
}) {
  // 2 weeks horizontal window starting on Sunday before cursor
  const start = useMemo(() => startOfWeek(cursor), [cursor]);
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(start, i)), [start]);
  const today = new Date();

  // group posts by network -> day
  const grid = useMemo(() => {
    const map = new Map<SocialNetwork, Map<string, EditorialPost[]>>();
    for (const n of NETWORKS) map.set(n, new Map());
    for (const p of posts) {
      const d = new Date(p.scheduled_at);
      const key = d.toISOString().slice(0, 10);
      const bucket = map.get(p.social_network)!;
      const arr = bucket.get(key) ?? [];
      arr.push(p);
      bucket.set(key, arr);
    }
    return map;
  }, [posts]);

  const activeNetworks = NETWORKS.filter((n) => (grid.get(n)?.size ?? 0) > 0);
  const networksToShow = activeNetworks.length > 0 ? activeNetworks : NETWORKS.slice(0, 3);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => onCursorChange(addDays(cursor, -7))}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onCursorChange(new Date())}>Hoje</Button>
        <Button variant="outline" size="icon" onClick={() => onCursorChange(addDays(cursor, 7))}>
          <ChevronRight className="size-4" />
        </Button>
        <div className="ml-2 text-sm text-foreground/60">
          {days[0].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} —{" "}
          {days[13].toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-surface">
        <div className="overflow-x-auto">
          <div className="inline-flex flex-col min-w-full">
            {/* Header: days */}
            <div className="flex border-b border-border bg-muted/30 sticky top-0">
              <div className="w-40 shrink-0 px-3 py-2 text-[10px] font-mono-kasa uppercase text-foreground/50 border-r border-border">
                Rede
              </div>
              {days.map((d) => {
                const isToday = sameDay(d, today);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={d.toISOString()}
                    style={{ width: DAY_W }}
                    className={cn(
                      "shrink-0 px-2 py-2 text-center border-r border-border last:border-r-0",
                      isWeekend && "bg-background/40",
                    )}
                  >
                    <div className="text-[10px] text-foreground/50 font-mono-kasa uppercase">
                      {d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                    </div>
                    <div className={cn(
                      "text-sm font-display mt-0.5 inline-grid place-items-center size-6 rounded-full",
                      isToday && "bg-primary text-primary-foreground",
                    )}>
                      {d.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Network rows */}
            {networksToShow.map((n) => (
              <div key={n} className="flex border-b border-border last:border-b-0 min-h-[88px]">
                <div className="w-40 shrink-0 px-3 py-2 border-r border-border flex items-center gap-2 bg-muted/20">
                  <SocialIcon network={n} size={20} />
                  <span className="text-sm font-medium">{SOCIAL_LABEL[n]}</span>
                </div>
                {days.map((d) => {
                  const key = d.toISOString().slice(0, 10);
                  const dayPosts = grid.get(n)?.get(key) ?? [];
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div
                      key={key}
                      style={{ width: DAY_W }}
                      className={cn(
                        "shrink-0 p-1.5 border-r border-border last:border-r-0 flex flex-col gap-1",
                        isWeekend && "bg-background/40",
                      )}
                    >
                      {dayPosts.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => onSelectPost(p)}
                          className={cn(
                            "text-left text-[10px] px-1.5 py-1 rounded-md border truncate hover:scale-[1.03] transition-transform",
                            STATUS_COLOR[p.status],
                          )}
                          title={`${p.title} — ${STATUS_LABEL[p.status]}`}
                        >
                          <span className="font-bold block truncate">{p.title}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
