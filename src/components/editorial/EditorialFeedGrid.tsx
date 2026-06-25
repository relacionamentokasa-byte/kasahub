import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  type EditorialPost, SOCIAL_LABEL, CONTENT_TYPE_LABEL, STATUS_LABEL, STATUS_COLOR,
} from "@/lib/editorial-api";
import { SocialIcon } from "./SocialIcon";
import { Film, Images, Image as ImageIcon } from "lucide-react";

const TYPE_ICON = { reels: Film, carousel: Images, static: ImageIcon } as const;

const TILE_BG: Record<string, string> = {
  instagram: "from-pink-500/30 via-fuchsia-500/20 to-amber-500/20",
  youtube: "from-red-500/30 via-red-700/20 to-rose-900/30",
  tiktok: "from-fuchsia-500/30 via-cyan-400/20 to-black/40",
  linkedin: "from-sky-500/30 via-blue-600/20 to-blue-900/30",
  facebook: "from-blue-500/30 via-blue-700/20 to-blue-900/30",
  other: "from-muted via-muted/40 to-muted",
};

function fmt(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function EditorialFeedGrid({
  posts, onSelectPost,
}: {
  posts: EditorialPost[];
  onSelectPost: (p: EditorialPost) => void;
}) {
  // Newest first — mimics Instagram profile feed (most recent top-left).
  const ordered = useMemo(
    () => [...posts].sort((a, b) => +new Date(b.scheduled_at) - +new Date(a.scheduled_at)),
    [posts],
  );

  if (ordered.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-2xl p-16 text-center text-foreground/50">
        Nenhum post no período. Crie um novo post para preencher o feed.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 max-w-3xl">
      {ordered.map((p) => {
        const Icon = TYPE_ICON[p.content_type] ?? ImageIcon;
        return (
          <button
            key={p.id}
            onClick={() => onSelectPost(p)}
            className={cn(
              "group relative aspect-square rounded-md overflow-hidden border border-border/40 transition-all hover:scale-[1.02] hover:z-10 hover:shadow-xl",
              !p.cover_url && "bg-gradient-to-br",
              !p.cover_url && (TILE_BG[p.social_network] ?? TILE_BG.other),
            )}
            title={`${SOCIAL_LABEL[p.social_network]} • ${CONTENT_TYPE_LABEL[p.content_type]} • ${STATUS_LABEL[p.status]}`}
          >
            {p.cover_url && (
              <img
                src={p.cover_url}
                alt={p.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            {/* corner: content type */}
            <div className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/60 backdrop-blur grid place-items-center">
              <Icon className="size-3 text-white" />
            </div>
            {/* corner: social */}
            <div className="absolute top-1.5 left-1.5">
              <SocialIcon network={p.social_network} size={20} />
            </div>
            {/* title */}
            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
              <p className="text-[11px] font-medium text-white line-clamp-2 leading-tight text-left">
                {p.title}
              </p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[9px] font-mono-kasa text-white/70 uppercase">
                  {fmt(new Date(p.scheduled_at))}
                </span>
                <span className={cn(
                  "text-[8px] px-1.5 py-0.5 rounded-full border font-mono-kasa uppercase",
                  STATUS_COLOR[p.status],
                )}>
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
