import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  type EditorialPost, SOCIAL_LABEL, CONTENT_TYPE_LABEL, STATUS_LABEL, STATUS_COLOR,
} from "@/lib/editorial-api";
import { SocialIcon } from "./SocialIcon";
import { ArrowUpDown } from "lucide-react";

type SortKey = "scheduled_at" | "title" | "social_network" | "content_type" | "status";

const COLS: { key: SortKey; label: string; w?: string; align?: string }[] = [
  { key: "scheduled_at", label: "Data", w: "w-32" },
  { key: "social_network", label: "Rede", w: "w-28" },
  { key: "title", label: "Título" },
  { key: "content_type", label: "Formato", w: "w-28" },
  { key: "status", label: "Status", w: "w-32" },
];

function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
function fmtTime(s: string) {
  return new Date(s).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function EditorialList({
  posts, onSelectPost,
}: {
  posts: EditorialPost[];
  onSelectPost: (p: EditorialPost) => void;
}) {
  const [sortBy, setSortBy] = useState<SortKey>("scheduled_at");
  const [asc, setAsc] = useState(true);

  const sorted = useMemo(() => {
    const out = [...posts];
    out.sort((a, b) => {
      const va = (a as any)[sortBy] ?? "";
      const vb = (b as any)[sortBy] ?? "";
      if (sortBy === "scheduled_at") return (+new Date(a.scheduled_at) - +new Date(b.scheduled_at)) * (asc ? 1 : -1);
      return String(va).localeCompare(String(vb), "pt-BR") * (asc ? 1 : -1);
    });
    return out;
  }, [posts, sortBy, asc]);

  function toggleSort(k: SortKey) {
    if (sortBy === k) setAsc(!asc);
    else { setSortBy(k); setAsc(true); }
  }

  if (sorted.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-2xl p-16 text-center text-foreground/50">
        Nenhum post no período.
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "text-left font-mono-kasa text-[10px] uppercase text-foreground/50 px-3 py-2.5 cursor-pointer select-none hover:text-foreground transition",
                    c.w,
                  )}
                  onClick={() => toggleSort(c.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    <ArrowUpDown className={cn("size-3", sortBy === c.key ? "text-primary" : "opacity-30")} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr
                key={p.id}
                onClick={() => onSelectPost(p)}
                className="border-b border-border/40 last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <td className="px-3 py-2.5 align-middle">
                  <div className="text-sm font-medium">{fmtDate(p.scheduled_at)}</div>
                  <div className="text-[10px] text-foreground/40 font-mono-kasa">{fmtTime(p.scheduled_at)}</div>
                </td>
                <td className="px-3 py-2.5 align-middle">
                  <span className="inline-flex items-center gap-2">
                    <SocialIcon network={p.social_network} size={18} />
                    <span className="text-xs text-foreground/80">{SOCIAL_LABEL[p.social_network]}</span>
                  </span>
                </td>
                <td className="px-3 py-2.5 align-middle">
                  <div className="font-medium truncate">{p.title}</div>
                  {p.description && (
                    <div className="text-[11px] text-foreground/50 truncate max-w-md">{p.description}</div>
                  )}
                </td>
                <td className="px-3 py-2.5 align-middle text-xs text-foreground/70">
                  {CONTENT_TYPE_LABEL[p.content_type]}
                </td>
                <td className="px-3 py-2.5 align-middle">
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full border font-mono-kasa uppercase",
                    STATUS_COLOR[p.status],
                  )}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
