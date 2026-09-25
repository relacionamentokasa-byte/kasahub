import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  type EditorialPost, SOCIAL_LABEL, CONTENT_TYPE_LABEL, STATUS_LABEL, STATUS_COLOR,
} from "@/lib/editorial-api";
import { SocialIcon } from "./SocialIcon";
import { Film, Images, Image as ImageIcon, Sparkles, Plus } from "lucide-react";

const TYPE_ICON = { reels: Film, carousel: Images, static: ImageIcon } as const;

const TILE_BG: Record<string, { gradient: string; accent: string; ring: string }> = {
  instagram: {
    gradient: "from-purple-900/80 via-pink-900/40 to-amber-900/50",
    accent: "bg-gradient-to-r from-pink-500 to-amber-500",
    ring: "border-pink-500/30",
  },
  youtube: {
    gradient: "from-red-950/90 via-red-900/40 to-zinc-950",
    accent: "bg-red-600",
    ring: "border-red-500/30",
  },
  tiktok: {
    gradient: "from-cyan-950/80 via-zinc-900 to-fuchsia-950/80",
    accent: "bg-gradient-to-r from-cyan-400 to-fuchsia-500",
    ring: "border-cyan-500/30",
  },
  linkedin: {
    gradient: "from-blue-950/90 via-sky-900/40 to-zinc-950",
    accent: "bg-sky-600",
    ring: "border-sky-500/30",
  },
  facebook: {
    gradient: "from-blue-950/90 via-indigo-950/50 to-zinc-950",
    accent: "bg-blue-600",
    ring: "border-blue-500/30",
  },
  other: {
    gradient: "from-zinc-900 via-zinc-850 to-zinc-950",
    accent: "bg-primary",
    ring: "border-border/60",
  },
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
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 max-w-4xl">
      {ordered.map((p) => {
        const Icon = TYPE_ICON[p.content_type] ?? ImageIcon;
        const theme = TILE_BG[p.social_network] ?? TILE_BG.other;

        return (
          <button
            key={p.id}
            onClick={() => onSelectPost(p)}
            className={cn(
              "group relative aspect-square rounded-xl overflow-hidden border transition-all duration-200 text-left cursor-pointer",
              "hover:scale-[1.02] hover:z-10 hover:shadow-2xl hover:shadow-black/50 hover:border-primary/50",
              p.cover_url ? "border-border/50 bg-muted/30" : cn("border-border/60 bg-gradient-to-br", theme.gradient, theme.ring)
            )}
            title={`${SOCIAL_LABEL[p.social_network]} • ${CONTENT_TYPE_LABEL[p.content_type]} • ${STATUS_LABEL[p.status]}`}
          >
            {p.cover_url ? (
              <>
                <img
                  src={p.cover_url}
                  alt={p.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/20" />
              </>
            ) : (
              /* Fallback Tipográfico Elegante quando não há imagem */
              <div className="absolute inset-0 flex flex-col justify-between p-3 sm:p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 to-transparent">
                {/* Header decorativo */}
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                    <SocialIcon network={p.social_network} size={14} />
                    <span className="text-[10px] font-medium text-white/90">
                      {SOCIAL_LABEL[p.social_network]}
                    </span>
                  </div>
                  <div className="size-6 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center">
                    <Icon className="size-3 text-white/80" />
                  </div>
                </div>

                {/* Centro: Título e Tipo */}
                <div className="my-auto z-10 space-y-1.5">
                  <span className="inline-block text-[9px] font-mono-kasa uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                    {CONTENT_TYPE_LABEL[p.content_type]}
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-white leading-snug line-clamp-3 group-hover:text-primary-foreground transition-colors drop-shadow-sm">
                    {p.title}
                  </p>
                </div>

                {/* Rodapé: Data e Status */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10 z-10">
                  <span className="text-[10px] font-mono-kasa text-white/70">
                    {fmt(new Date(p.scheduled_at))}
                  </span>
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full border font-mono-kasa font-medium uppercase backdrop-blur-md",
                    STATUS_COLOR[p.status],
                  )}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>

                {/* Subtle hover prompt to add/edit cover */}
                <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                  <span className="text-[11px] font-medium text-white bg-black/80 px-2.5 py-1 rounded-full border border-white/20 shadow-lg flex items-center gap-1">
                    <Sparkles className="size-3 text-amber-400" />
                    Editar / Capa
                  </span>
                </div>
              </div>
            )}

            {/* Overlays for post with cover image */}
            {p.cover_url && (
              <>
                {/* corner: content type */}
                <div className="absolute top-2 right-2 size-6 rounded-full bg-black/70 backdrop-blur-md grid place-items-center border border-white/15">
                  <Icon className="size-3 text-white" />
                </div>
                {/* corner: social */}
                <div className="absolute top-2 left-2 size-6 rounded-full bg-black/70 backdrop-blur-md grid place-items-center border border-white/15">
                  <SocialIcon network={p.social_network} size={14} />
                </div>
                {/* title & meta bottom */}
                <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
                  <p className="text-[11px] sm:text-xs font-medium text-white line-clamp-2 leading-tight text-left drop-shadow-sm">
                    {p.title}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[9px] font-mono-kasa text-white/80 uppercase">
                      {fmt(new Date(p.scheduled_at))}
                    </span>
                    <span className={cn(
                      "text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-full border font-mono-kasa uppercase backdrop-blur-md",
                      STATUS_COLOR[p.status],
                    )}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </div>
                </div>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
